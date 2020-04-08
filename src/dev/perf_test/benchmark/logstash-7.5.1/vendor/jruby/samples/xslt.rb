include Java
require 'optparse'
require 'ostruct'

import java.io.FileOutputStream
import javax.xml.transform.stream.StreamSource
import javax.xml.transform.TransformerFactory

class XSLTOptions
  def self.parse(args)
    options = OpenStruct.new
    options.parameters = {}
       
    opts = OptionParser.new do |opts|
      opts.banner = "Usage: [options] xslt {xml} {xslt} [{result}]"
      opts.separator ""
      opts.separator "Specific options:"
      
      opts.on("-p", "--parameters name=value,name1=value1", Array) do |n|
	n.collect do |v| 
	  name, value = v.split(/\s*=\s*/)
	  options.parameters[name] = value
	end
      end
    end  
    opts.parse!(args)
    options
  end
end

options = XSLTOptions.parse(ARGV)

if (ARGV.length < 2 || ARGV.length > 3) 
  puts "Usage: xslt {xml} {xslt} [{result}]"
  exit
end

document = StreamSource.new ARGV[0]
stylesheet = StreamSource.new ARGV[1]
output = ARGV.length < 3 ? java.lang.System::out : FileOutputStream.new(ARGV[2])
result = javax.xml.transform.stream.StreamResult.new output

begin
  transformer = TransformerFactory.newInstance.newTransformer(stylesheet)
  options.parameters.each {|name, value| transformer.setParameter(name, value) }
  transformer.transform(document, result)
rescue java.lang.Exception => e
  puts e
end
