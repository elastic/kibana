require 'mkmf'
require 'fileutils'

def patch_autogen
  # s/libtoolize/glibtoolize/
  File.write('autogen.sh', File.read('autogen.sh').gsub(/libtoolize/, 'glibtoolize'))
end

unless have_library 'snappy'
  # build vendor/snappy
  pwd = File.dirname File.expand_path __FILE__
  dir = File.join pwd, '..', 'vendor', 'snappy'

  Dir.chdir dir do
    unless system './autogen.sh'
      patch_autogen
      raise '`autogen.sh` failed' unless system './autogen.sh'
    end
    raise '`configure` failed'  unless system './configure --disable-option-checking --disable-dependency-tracking --disable-gtest --without-gflags'
  end

  src = %w(
   config.h
   snappy-c.cc
   snappy-c.h
   snappy-internal.h
   snappy-sinksource.cc
   snappy-sinksource.h
   snappy-stubs-internal.cc
   snappy-stubs-internal.h
   snappy-stubs-public.h
   snappy.cc
   snappy.h
  ).map { |e| File.join dir, e }
  FileUtils.cp src, pwd, :verbose => true
end

create_makefile 'snappy_ext'
