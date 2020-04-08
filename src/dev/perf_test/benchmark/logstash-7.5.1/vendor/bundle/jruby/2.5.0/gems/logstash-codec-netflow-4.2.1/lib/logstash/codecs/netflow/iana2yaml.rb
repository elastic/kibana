#!/usr/bin/env ruby

require 'open-uri'
require 'csv'
require 'yaml'

# Convert IANA types to those used by BinData or created by ourselves
def iana2bindata(type)
  case type
  when /^unsigned(\d+)$/
    return 'uint' + $1
  when /^signed(\d+)$/
    return 'int' + $1
  when 'float32'
    return 'float'
  when 'float64'
    return 'double'
  when 'ipv4Address'
    return 'ip4_addr'
  when 'ipv6Address'
    return 'ip6_addr'
  when 'macAddress'
    return 'mac_addr'
  when 'octetArray', 'string'
    return 'string'
  when 'dateTimeSeconds'
    return 'uint32'
  when 'dateTimeMilliseconds', 'dateTimeMicroseconds', 'dateTimeNanoseconds'
    return 'uint64'
  when 'boolean'
    return 'uint8'
  when 'basicList', 'subTemplateList', 'subTemplateMultiList'
    return 'skip'
  else
    raise "Unknown type #{type}"
  end
end

def iana2hash(url)
  fields = { 0 => {} }

  # Read in IANA-registered Information Elements (PEN 0)
  CSV.new(open(url), :headers => :first_row, :converters => :numeric).each do |line|
    # If it's not a Fixnum it's something like 'x-y' used to mark reserved blocks
    next if line['ElementID'].class != Fixnum

    # Blacklisted ID's
    next if [0].include?(line['ElementID'])

    # Skip any elements with no name
    next unless line['Name'] and line['Data Type']

    fields[0][line['ElementID']] = [iana2bindata(line['Data Type']).to_sym]
    if fields[0][line['ElementID']][0] != :skip
      fields[0][line['ElementID']] << line['Name'].to_sym
    end
  end

  # Overrides
  fields[0][210][0] = :skip # 210 is PaddingOctets so skip them properly
  fields[0][210].delete_at(1)

  # Generate the reverse PEN (PEN 29305)
  reversed = fields[0].reject { |k|
    # Excluded according to RFC 5103
    [40,41,42,130,131,137,145,148,149,163,164,165,166,167,168,173,210,211,212,213,214,215,216,217,239].include?(k)
  }.map { |k,v|
    [k, v.size > 1 ? [v[0], ('reverse' + v[1].to_s.slice(0,1).capitalize + v[1].to_s.slice(1..-1)).to_sym] : [v[0]]]
  }
  fields[29305] = Hash[reversed]

  return fields
end

ipfix_fields = iana2hash('http://www.iana.org/assignments/ipfix/ipfix-information-elements.csv')

puts YAML.dump(ipfix_fields)
