# Copyright (c) 2010-2013 Michael Dvorkin
#
# Awesome Print is freely distributable under the terms of MIT license.
# See LICENSE file or http://www.opensource.org/licenses/mit-license.php
#------------------------------------------------------------------------------
class String
  #
  # ANSI color codes:
  #   \e => escape
  #   30 => color base
  #    1 => bright
  #    0 => normal
  #
  # For HTML coloring we use <kbd> tag instead of <span> to require monospace
  # font. Note that beloved <tt> has been removed from HTML5.
  #
  %w(gray red green yellow blue purple cyan white).zip(
  %w(black darkred darkgreen brown navy darkmagenta darkcyan slategray)).each_with_index do |(color, shade), i|
    define_method color do |*html|
      html[0] ? %Q|<kbd style="color:#{color}">#{self}</kbd>| : "\e[1;#{30+i}m#{self}\e[0m"
    end

    define_method "#{color}ish" do |*html|
      html[0] ? %Q|<kbd style="color:#{shade}">#{self}</kbd>| : "\e[0;#{30+i}m#{self}\e[0m"
    end
  end

  alias :black :grayish
  alias :pale  :whiteish

end
