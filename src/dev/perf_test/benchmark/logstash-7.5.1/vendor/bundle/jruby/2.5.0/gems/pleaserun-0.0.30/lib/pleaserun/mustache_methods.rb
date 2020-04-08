require "pleaserun/namespace"
require "shellwords" # stdlib
require "mustache" # gem 'mustache'

# Methods for use within mustache render() calls.
module PleaseRun::MustacheMethods
  def escaped_args
    return if args.nil?
    return Shellwords.shellescape(Shellwords.shelljoin(args))
  end # def escaped_args

  def escaped(str)
    return Shellwords.shellescape(Mustache.render(str, self))
  end # def escaped

  def shell_args
    return if args.nil?
    return args.collect { |a| shell_quote(a) }.join(" ")
  end # def shell_args

  def shell_quote(str)
    # interpreted from POSIX 1003.1 2004 section 2.2.3 (Double-Quotes)

    # $ is has meaning, escape it.
    value = str.gsub(/(?<![\\])\$/, "\\$")
    # ` is has meaning, escape it.
    value = value.gsub(/`/) { "\\`" }

    # Backslash means escape a literal unless followed by one of $`"\
    value = value.gsub(/\\[^$`"\\]/) { |v| "\\#{v}" }    

    return "\"" + value + "\""
  end # def shell_quote

  def shell_continuation(str)
    return render(str).split("\n").reject { |l| l =~ /^\s*$/ }.join(" \\\n")
  end # def shell_continuation

  def quoted(str)
    return shell_quote(render(str))
  end
end
