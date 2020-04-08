#--
#
# $RCSfile$
#
# = Ruby-space predefined Digest subclasses
#
# = Info
# 'OpenSSL for Ruby 2' project
# Copyright (C) 2002  Michal Rokos <m.rokos@sh.cvut.cz>
# All rights reserved.
#
# = Licence
# This program is licenced under the same licence as Ruby.
# (See the file 'LICENCE'.)
#
# = Version
# $Id$
#
#++

module OpenSSL
  class Digest
    # This class is only provided for backwards compatibility.  Use OpenSSL::Digest in the future.
    class Digest < Digest
      def initialize(*args)
        # add warning
        super(*args)
      end
    end
  end # Digest
end # OpenSSL

