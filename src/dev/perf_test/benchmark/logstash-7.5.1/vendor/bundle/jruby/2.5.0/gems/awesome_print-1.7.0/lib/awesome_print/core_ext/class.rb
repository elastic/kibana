# Copyright (c) 2010-2013 Michael Dvorkin
#
# Awesome Print is freely distributable under the terms of MIT license.
# See LICENSE file or http://www.opensource.org/licenses/mit-license.php
#------------------------------------------------------------------------------
class Class #:nodoc:
  #
  # Intercept methods below to inject @__awesome_print__ instance variable
  # so we know it is the *methods* array when formatting an array.
  #
  # Remaining public/private etc. '_methods' are handled in core_ext/object.rb.
  #
  %w(instance_methods private_instance_methods protected_instance_methods public_instance_methods).each do |name|
    original_method = instance_method(name)

    define_method name do |*args|
      methods = original_method.bind(self).call(*args)
      methods.instance_variable_set('@__awesome_methods__', self)
      methods
    end
  end
end
