autoload :CGI, "cgi"

module AwesomePrint
  module Colorize

    # Pick the color and apply it to the given string as necessary.
    #------------------------------------------------------------------------------
    def colorize(str, type)
      str = CGI.escapeHTML(str) if options[:html]
      if options[:plain] || !options[:color][type] || !inspector.colorize?
        str
      #
      # Check if the string color method is defined by awesome_print and accepts
      # html parameter or it has been overriden by some gem such as colorize.
      #
      elsif str.method(options[:color][type]).arity == -1 # Accepts html parameter.
        str.send(options[:color][type], options[:html])
      else
        str = %Q|<kbd style="color:#{options[:color][type]}">#{str}</kbd>| if options[:html]
        str.send(options[:color][type])
      end
    end
  end
end
