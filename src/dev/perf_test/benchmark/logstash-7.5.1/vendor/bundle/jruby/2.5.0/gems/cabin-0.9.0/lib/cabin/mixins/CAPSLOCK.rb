require "cabin/namespace"

# ALL CAPS MEANS SERIOUS BUSINESS
module Cabin::Mixins::CAPSLOCK
  def self.extended(instance)
    self.included(instance.class)
  end
  def self.included(klass)
    klass.filter do |event|
      # CAPITALIZE ALL THE STRINGS
      event.each do |key, value|
        event[key] = value.upcase if value.respond_to?(:upcase)
      end
    end
  end
end # MODULE CABIN::MIXINS::CAPSLOCK
