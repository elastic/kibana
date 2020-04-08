# encoding: UTF-8
# frozen_string_literal: true

module TZInfo
  module DataSources
    # An {InvalidZoneinfoFile} exception is raised if an attempt is made to load
    # an invalid zoneinfo file.
    class InvalidZoneinfoFile < StandardError
    end

    # Reads compiled zoneinfo TZif (\0, 2 or 3) files.
    class ZoneinfoReader #:nodoc:
      # Initializes a new {ZoneinfoReader}.
      #
      # @param string_deduper [StringDeduper] a {StringDeduper} instance to use
      #   when deduping abbreviations.
      def initialize(string_deduper)
        @string_deduper = string_deduper
      end

      # Reads a zoneinfo structure from the given path. Returns either a
      # {TimezoneOffset} that is constantly observed or an `Array`
      # {TimezoneTransition}s.
      #
      # @param file_path [String] the path of a zoneinfo file.
      # @return [Object] either a {TimezoneOffset} or an `Array` of
      #   {TimezoneTransition}s.
      # @raise [SecurityError] if safe mode is enabled and `file_path` is
      #   tainted.
      # @raise [InvalidZoneinfoFile] if `file_path`` does not refer to a valid
      #   zoneinfo file.
      def read(file_path)
        File.open(file_path, 'rb') { |file| parse(file) }
      end

      private

      # Translates an unsigned 32-bit integer (as returned by unpack) to signed
      # 32-bit.
      #
      # @param long [Integer] an unsigned 32-bit integer.
      # @return [Integer] {long} translated to signed 32-bit.
      def make_signed_int32(long)
        long >= 0x80000000 ? long - 0x100000000 : long
      end

      # Translates a pair of unsigned 32-bit integers (as returned by unpack,
      # most significant first) to a signed 64-bit integer.
      #
      # @param high [Integer] the most significant 32-bits.
      # @param low [Integer] the least significant 32-bits.
      # @return [Integer] {high} and {low} combined and translated to signed
      #   64-bit.
      def make_signed_int64(high, low)
        unsigned = (high << 32) | low
        unsigned >= 0x8000000000000000 ? unsigned - 0x10000000000000000 : unsigned
      end

      # Reads the given number of bytes from the given file and checks that the
      # correct number of bytes could be read.
      #
      # @param file [IO] the file to read from.
      # @param bytes [Integer] the number of bytes to read.
      # @return [String] the bytes that were read.
      # @raise [InvalidZoneinfoFile] if the number of bytes available didn't
      #   match the number requested.
      def check_read(file, bytes)
        result = file.read(bytes)

        unless result && result.length == bytes
          raise InvalidZoneinfoFile, "Expected #{bytes} bytes reading '#{file.path}', but got #{result ? result.length : 0} bytes"
        end

        result
      end

      # Zoneinfo files don't include the offset from standard time (std_offset)
      # for DST periods. Derive the base offset (base_utc_offset) where DST is
      # observed from either the previous or next non-DST period.
      #
      # @param transitions [Array<Hash>] an `Array` of transition hashes.
      # @param offsets [Array<Hash>] an `Array` of offset hashes.
      # @return [Integer] the index of the offset to be used prior to the first
      #   transition.
      def derive_offsets(transitions, offsets)
        # The first non-DST offset (if there is one) is the offset observed
        # before the first transition. Fall back to the first DST offset if
        # there are no non-DST offsets.
        first_non_dst_offset_index = offsets.index {|o| !o[:is_dst] }
        first_offset_index = first_non_dst_offset_index || 0
        return first_offset_index if transitions.empty?

        # Determine the base_utc_offset of the next non-dst offset at each transition.
        base_utc_offset_from_next = nil

        transitions.reverse_each do |transition|
          offset = offsets[transition[:offset]]
          if offset[:is_dst]
            transition[:base_utc_offset_from_next] = base_utc_offset_from_next if base_utc_offset_from_next
          else
            base_utc_offset_from_next = offset[:observed_utc_offset]
          end
        end

        base_utc_offset_from_previous = first_non_dst_offset_index ? offsets[first_non_dst_offset_index][:observed_utc_offset] : nil
        defined_offsets = {}

        transitions.each do |transition|
          offset_index = transition[:offset]
          offset = offsets[offset_index]
          observed_utc_offset = offset[:observed_utc_offset]

          if offset[:is_dst]
            base_utc_offset_from_next = transition[:base_utc_offset_from_next]

            difference_to_previous = (observed_utc_offset - (base_utc_offset_from_previous || observed_utc_offset)).abs
            difference_to_next = (observed_utc_offset - (base_utc_offset_from_next || observed_utc_offset)).abs

            base_utc_offset = if difference_to_previous == 3600
              base_utc_offset_from_previous
            elsif difference_to_next == 3600
              base_utc_offset_from_next
            elsif difference_to_previous > 0 && difference_to_next > 0
              difference_to_previous < difference_to_next ? base_utc_offset_from_previous : base_utc_offset_from_next
            elsif difference_to_previous > 0
              base_utc_offset_from_previous
            elsif difference_to_next > 0
              base_utc_offset_from_next
            else
              # No difference, assume a 1 hour offset from standard time.
              observed_utc_offset - 3600
            end

            if !offset[:base_utc_offset]
              offset[:base_utc_offset] = base_utc_offset
              defined_offsets[offset] = offset_index
            elsif offset[:base_utc_offset] != base_utc_offset
              # An earlier transition has already derived a different
              # base_utc_offset. Define a new offset or reuse an existing identically
              # defined offset.
              new_offset = offset.dup
              new_offset[:base_utc_offset] = base_utc_offset

              offset_index = defined_offsets[new_offset]

              unless offset_index
                offsets << new_offset
                offset_index = offsets.length - 1
                defined_offsets[new_offset] = offset_index
              end

              transition[:offset] = offset_index
            end
          else
            base_utc_offset_from_previous = observed_utc_offset
          end
        end

        first_offset_index
      end

      # Parses a zoneinfo file and returns either a {TimezoneOffset} that is
      # constantly observed or an `Array` of {TimezoneTransition}s.
      #
      # @param file [IO] the file to be read.
      # @return [Object] either a {TimezoneOffset} or an `Array` of
      #   {TimezoneTransition}s.
      # @raise [InvalidZoneinfoFile] if the file is not a valid zoneinfo file.
      def parse(file)
        magic, version, ttisgmtcnt, ttisstdcnt, leapcnt, timecnt, typecnt, charcnt =
          check_read(file, 44).unpack('a4 a x15 NNNNNN')

        if magic != 'TZif'
          raise InvalidZoneinfoFile, "The file '#{file.path}' does not start with the expected header."
        end

        if version == '2' || version == '3'
          # Skip the first 32-bit section and read the header of the second 64-bit section
          file.seek(timecnt * 5 + typecnt * 6 + charcnt + leapcnt * 8 + ttisgmtcnt + ttisstdcnt, IO::SEEK_CUR)

          prev_version = version

          magic, version, ttisgmtcnt, ttisstdcnt, leapcnt, timecnt, typecnt, charcnt =
            check_read(file, 44).unpack('a4 a x15 NNNNNN')

          unless magic == 'TZif' && (version == prev_version)
            raise InvalidZoneinfoFile, "The file '#{file.path}' contains an invalid 64-bit section header."
          end

          using_64bit = true
        elsif version != '3' && version != '2' && version != "\0"
          raise InvalidZoneinfoFile, "The file '#{file.path}' contains a version of the zoneinfo format that is not currently supported."
        else
          using_64bit = false
        end

        unless leapcnt == 0
          raise InvalidZoneinfoFile, "The file '#{file.path}' contains leap second data. TZInfo requires zoneinfo files that omit leap seconds."
        end

        transitions = if using_64bit
          timecnt.times.map do |i|
            high, low = check_read(file, 8).unpack('NN'.freeze)
            transition_time = make_signed_int64(high, low)
            {at: transition_time}
          end
        else
          timecnt.times.map do |i|
            transition_time = make_signed_int32(check_read(file, 4).unpack('N'.freeze)[0])
            {at: transition_time}
          end
        end

        check_read(file, timecnt).unpack('C*'.freeze).each_with_index do |localtime_type, i|
          raise InvalidZoneinfoFile, "Invalid offset referenced by transition in file '#{file.path}'." if localtime_type >= typecnt
          transitions[i][:offset] = localtime_type
        end

        offsets = typecnt.times.map do |i|
          gmtoff, isdst, abbrind = check_read(file, 6).unpack('NCC'.freeze)
          gmtoff = make_signed_int32(gmtoff)
          isdst = isdst == 1
          {observed_utc_offset: gmtoff, is_dst: isdst, abbr_index: abbrind}
        end

        abbrev = check_read(file, charcnt)

        # Derive the offsets from standard time (std_offset).
        first_offset_index = derive_offsets(transitions, offsets)

        offsets = offsets.map do |o|
          observed_utc_offset = o[:observed_utc_offset]
          base_utc_offset = o[:base_utc_offset]

          if base_utc_offset
            # DST offset with base_utc_offset derived by derive_offsets.
            std_offset = observed_utc_offset - base_utc_offset
          elsif o[:is_dst]
            # DST offset unreferenced by a transition (offset in use before the
            # first transition). No derived base UTC offset, so assume 1 hour
            # DST.
            base_utc_offset = observed_utc_offset - 3600
            std_offset = 3600
          else
            # Non-DST offset.
            base_utc_offset = observed_utc_offset
            std_offset = 0
          end

          abbrev_start = o[:abbr_index]
          raise InvalidZoneinfoFile, "Abbreviation index is out of range in file '#{file.path}'." unless abbrev_start < abbrev.length

          abbrev_end = abbrev.index("\0", abbrev_start)
          raise InvalidZoneinfoFile, "Missing abbreviation null terminator in file '#{file.path}'." unless abbrev_end

          abbr = @string_deduper.dedupe(abbrev[abbrev_start...abbrev_end].force_encoding(Encoding::UTF_8).untaint)

          TimezoneOffset.new(base_utc_offset, std_offset, abbr)
        end

        first_offset = offsets[first_offset_index]


        if transitions.empty?
          first_offset
        else
          previous_offset = first_offset
          previous_at = nil

          transitions.map do |t|
            offset = offsets[t[:offset]]
            at = t[:at]
            raise InvalidZoneinfoFile, "Transition at #{at} is not later than the previous transition at #{previous_at} in file '#{file.path}'." if previous_at && previous_at >= at
            tt = TimezoneTransition.new(offset, previous_offset, at)
            previous_offset = offset
            previous_at = at
            tt
          end
        end
      end
    end
    private_constant :ZoneinfoReader
  end
end
