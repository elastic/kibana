# frozen-string-literal: true
#
# The blank extension adds the blank? method to all objects (e.g. Object#blank?).
#
# To load the extension:
#
#   Sequel.extension :blank

class FalseClass
  # false is always blank
  def blank?
    true
  end
end

class Object
  # Objects are blank if they respond true to empty?
  def blank?
    respond_to?(:empty?) && empty?
  end
end

class NilClass
  # nil is always blank
  def blank?
    true
  end
end

class Numeric
  # Numerics are never blank (not even 0)
  def blank?
    false
  end
end

class String
  # Strings are blank if they are empty or include only whitespace
  def blank?
    strip.empty?
  end
end

class TrueClass
  # true is never blank
  def blank?
    false
  end
end
