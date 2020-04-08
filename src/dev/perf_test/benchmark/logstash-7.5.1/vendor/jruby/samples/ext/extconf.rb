# Loads mkmf which is used to make makefiles for Ruby extensions
require 'mkmf'

# Give it a name
extension_name = 'mytest'

# The destination
dir_config(extension_name)

# Do the work
create_makefile(extension_name)

