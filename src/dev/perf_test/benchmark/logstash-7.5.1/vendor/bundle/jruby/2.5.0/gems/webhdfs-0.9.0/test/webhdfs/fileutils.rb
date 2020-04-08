require 'test_helper'

class FileUtilsTest < Test::Unit::TestCase
  def setup
    require 'lib/webhdfs'
    require 'lib/webhdfs/fileutils'
  end

  def test_copy_from_local
    WebHDFS::FileUtils.copy_from_local('VERSION', 'VERSION', :verbose => true)
    WebHDFS::FileUtils.copy_to_local('VERSION', 'VERSION2', :verbose => true)
    WebHDFS::FileUtils.append('VERSION', 'foo-bar-buzz', :verbose => true)
    WebHDFS::FileUtils.rm('VERSION', :verbose => true)
  end

  def test_copy_from_local_via_stream
    WebHDFS::FileUtils.copy_from_local_via_stream('VERSION', '/user/jay/VERSION', :verbose => true)
    WebHDFS::FileUtils.rm('VERSION', :verbose => true)
  end

  def test_rm
    WebHDFS::FileUtils.mkdir('foo', :mode => 0777, :verbose => true)
    WebHDFS::FileUtils.rm('foo', :verbose => true)
  end

  def test_rmr
    WebHDFS::FileUtils.mkdir_p('foo/bar/buzz', :mode => 0777, :verbose => true)
    WebHDFS::FileUtils.rmr('foo', :verbose => true)
  end

  def test_rename
    #WebHDFS::FileUtils.mkdir_p('foo', :mode => 0777, :verbose => true)
    #WebHDFS::FileUtils.rename('foo', 'foo2', :verbose => true)
    #WebHDFS::FileUtils.rmr('foo2', :verbose => true)
  end

  def test_chmod
    WebHDFS::FileUtils.mkdir('foo', :mode => 0777, :verbose => true)
    WebHDFS::FileUtils.chmod(0755, 'foo', :verbose => true)
    WebHDFS::FileUtils.chmod(0777, 'foo', :verbose => true)
    WebHDFS::FileUtils.rm('foo', :verbose => true)
  end

  def test_chown
    #WebHDFS::FileUtils.mkdir('foo', :mode => 0777, :verbose => true)
    #WebHDFS::FileUtils.chown('webuser', 'supergroup', 'foo', :verbose => true)
    #WebHDFS::FileUtils.rm('foo', :verbose => true)
  end

  def test_set_repl_factor
    WebHDFS::FileUtils.mkdir('foo', :mode => 0777, :verbose => true)
    WebHDFS::FileUtils.set_repl_factor('foo', 2)
    WebHDFS::FileUtils.rm('foo', :verbose => true)
  end

  def test_set_atime
    #WebHDFS::FileUtils.mkdir('foo', :mode => 0777, :verbose => true)
    #WebHDFS::FileUtils.set_atime('foo', Time.now)
    #WebHDFS::FileUtils.rm('foo', :verbose => true)
  end

  def test_set_mtime
    #WebHDFS::FileUtils.mkdir('foo', :mode => 0777, :verbose => true)
    #WebHDFS::FileUtils.set_mtime('foo', Time.now)
    #WebHDFS::FileUtils.rm('foo', :verbose => true)
  end
end
