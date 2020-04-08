require "java"

filename = __FILE__
fr = java.io.FileReader.new filename
br = java.io.BufferedReader.new fr

s = br.readLine

print "------ ", filename, "------\n"

while s
  puts s.to_s
  s = br.readLine
end

print "------ ", filename, " end ------\n";

br.close
