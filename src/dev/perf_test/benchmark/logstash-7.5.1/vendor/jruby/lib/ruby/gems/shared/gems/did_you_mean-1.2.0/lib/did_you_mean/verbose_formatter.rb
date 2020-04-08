require 'did_you_mean'
require 'did_you_mean/formatters/verbose_formatter'

DidYouMean.formatter = DidYouMean::VerboseFormatter.new

warn '`require "did_you_mean/verbose_formatter"\' has been deprecated and will be removed' \
     " in the next major Ruby version. Please require 'did_you_mean/verbose' instead."
