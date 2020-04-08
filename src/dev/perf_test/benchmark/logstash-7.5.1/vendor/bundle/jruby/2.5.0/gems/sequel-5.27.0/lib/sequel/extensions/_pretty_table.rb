# frozen-string-literal: true
#
# This _pretty_table extension is only for internal use.
# It adds the Sequel::PrettyTable class without modifying 
# Sequel::Dataset.
#
# To load the extension:
#
#   Sequel.extension :_pretty_table
#
# Related module: Sequel::PrettyTable

#
module Sequel
  module PrettyTable
    # Prints nice-looking plain-text tables via puts
    # 
    #   +--+-------+
    #   |id|name   |
    #   |--+-------|
    #   |1 |fasdfas|
    #   |2 |test   |
    #   +--+-------+
    def self.print(records, columns=nil)
      puts string(records, columns)
    end

    # Return the string that #print will print via puts.
    def self.string(records, columns = nil) # records is an array of hashes
      columns ||= records.first.keys.sort
      sizes = column_sizes(records, columns)
      sep_line = separator_line(columns, sizes)

      array = [sep_line, header_line(columns, sizes), sep_line]
      records.each {|r| array << data_line(columns, sizes, r)}
      array << sep_line
      array.join("\n")
    end

    # Hash of the maximum size of the value for each column 
    def self.column_sizes(records, columns) # :nodoc:
      sizes = Hash.new {0}
      columns.each do |c|
        s = c.to_s.size
        sizes[c] = s if s > sizes[c]
      end
      records.each do |r|
        columns.each do |c|
          s = r[c].to_s.size
          sizes[c] = s if s > sizes[c]
        end
      end
      sizes
    end
    
    # String for each data line
    def self.data_line(columns, sizes, record) # :nodoc:
      String.new << '|' << columns.map {|c| format_cell(sizes[c], record[c])}.join('|') << '|'
    end
    
    # Format the value so it takes up exactly size characters
    def self.format_cell(size, v) # :nodoc:
      case v
      when Integer
        "%#{size}d" % v
      when Float, BigDecimal
        "%#{size}g" % v
      else
        "%-#{size}s" % v.to_s
      end
    end
    
    # String for header line
    def self.header_line(columns, sizes) # :nodoc:
      String.new << '|' << columns.map {|c| "%-#{sizes[c]}s" % c.to_s}.join('|') << '|'
    end

    # String for separtor line
    def self.separator_line(columns, sizes) # :nodoc:
      String.new << '+' << columns.map {|c| '-' * sizes[c]}.join('+') << '+'
    end

    private_class_method :column_sizes, :data_line, :format_cell, :header_line, :separator_line
  end
end

