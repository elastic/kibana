# encoding: utf-8
require "ffi"

module Winhelper
  extend FFI::Library

  ffi_lib 'kernel32'
  ffi_convention :stdcall

  class FileTime < FFI::Struct
    layout :lowDateTime, :uint, :highDateTime, :uint
  end

  #http://msdn.microsoft.com/en-us/library/windows/desktop/aa363788(v=vs.85).aspx
  class FileInformation < FFI::Struct
    layout :fileAttributes, :uint, #DWORD    dwFileAttributes;
    :createTime, FileTime, #      FILETIME ftCreationTime;
    :lastAccessTime, FileTime, #  FILETIME ftLastAccessTime;
    :lastWriteTime, FileTime, #   FILETIME ftLastWriteTime;
    :volumeSerialNumber, :uint, # DWORD    dwVolumeSerialNumber;
    :fileSizeHigh, :uint, #       DWORD    nFileSizeHigh;
    :fileSizeLow, :uint, #        DWORD    nFileSizeLow;
    :numberOfLinks, :uint, #      DWORD    nNumberOfLinks;
    :fileIndexHigh, :uint, #      DWORD    nFileIndexHigh;
    :fileIndexLow, :uint #        DWORD    nFileIndexLow;
  end

  # https://msdn.microsoft.com/en-us/library/windows/desktop/hh965605(v=vs.85).aspx
  class FileId128 < FFI::Struct
    layout :lowPart, :ulong_long, :highPart, :ulong_long
  end

  # https://msdn.microsoft.com/en-us/library/windows/desktop/hh802691(v=vs.85).aspx
  class FileIdInfo < FFI::Struct
    layout :volumeSerialNumber, :ulong_long, :fileId, FileId128
    # ULONGLONG   VolumeSerialNumber;
    # FILE_ID_128 FileId;
  end

  FileInfoEnum = enum(
    :FileBasicInfo,
    :FileStandardInfo,
    :FileNameInfo,
    :FileRenameInfo,
    :FileDispositionInfo,
    :FileAllocationInfo,
    :FileEndOfFileInfo,
    :FileStreamInfo,
    :FileCompressionInfo,
    :FileAttributeTagInfo,
    :FileIdBothDirectoryInfo,
    :FileIdBothDirectoryRestartInfo,
    :FileIoPriorityHintInfo,
    :FileRemoteProtocolInfo,
    :FileFullDirectoryInfo,
    :FileFullDirectoryRestartInfo,
    :FileStorageInfo,
    :FileAlignmentInfo,
    :FileIdInfo,
    :FileIdExtdDirectoryInfo,
    :FileIdExtdDirectoryRestartInfo
  )

  #http://msdn.microsoft.com/en-us/library/windows/desktop/aa363858(v=vs.85).aspx
  #HANDLE WINAPI CreateFile(
  # _In_      LPCTSTR lpFileName,
  # _In_      DWORD dwDesiredAccess,
  # _In_      DWORD dwShareMode,
  # _In_opt_  LPSECURITY_ATTRIBUTES lpSecurityAttributes,
  # _In_      DWORD dwCreationDisposition,
  # _In_      DWORD dwFlagsAndAttributes, _In_opt_  HANDLE hTemplateFile);
  attach_function :CreateFileA, [:pointer, :uint, :uint, :pointer, :uint, :uint, :pointer], :pointer
  attach_function :CreateFileW, [:pointer, :uint, :uint, :pointer, :uint, :uint, :pointer], :pointer

  #http://msdn.microsoft.com/en-us/library/windows/desktop/aa364952(v=vs.85).aspx
  #BOOL WINAPI GetFileInformationByHandle(
  # _In_   HANDLE hFile,
  # _Out_  LPBY_HANDLE_FILE_INFORMATION lpFileInformation);
  attach_function :GetFileInformationByHandle, [:pointer, :pointer], :int

  #https://msdn.microsoft.com/en-us/library/windows/desktop/aa364953(v=vs.85).aspx
  #BOOL WINAPI GetFileInformationByHandleEx(
  # _In_  HANDLE hFile,
  # _In_  FILE_INFO_BY_HANDLE_CLASS FileInformationClass,
  # _Out_ LPVOID lpFileInformation,
  # _In_  DWORD  dwBufferSize );
  attach_function :GetFileInformationByHandleEx, [:pointer, FileInfoEnum, :pointer, :uint], :uint

  attach_function :CloseHandle, [:pointer], :int

  #https://msdn.microsoft.com/en-us/library/windows/desktop/aa964920(v=vs.85).aspx
  #BOOL WINAPI GetVolumeInformationByHandleW(
  # _In_ HANDLE hFile,
  # _Out_opt_ LPWSTR lpVolumeNameBuffer,
  # _In_      DWORD   nVolumeNameSize,
  # _Out_opt_ LPDWORD lpVolumeSerialNumber,
  # _Out_opt_ LPDWORD lpMaximumComponentLength,
  # _Out_opt_ LPDWORD lpFileSystemFlags,
  # _Out_opt_ LPWSTR lpFileSystemNameBuffer,
  # _In_      DWORD nFileSystemNameSize);
  attach_function :GetVolumeInformationByHandleW, [:pointer, :pointer, :uint, :pointer, :pointer, :pointer, :pointer, :uint], :int

  def self.file_system_type_from_path(path)
    file_system_type_from_handle(open_handle_from_path(path))
  end

  def self.file_system_type_from_io(io)
    FileWatch::FileExt.io_handle(io) do |pointer|
      file_system_type_from_handle(pointer, false)
    end
  end

  def self.file_system_type_from_handle(handle, close_handle = true)
    out = FFI::MemoryPointer.new(:char, 256, true)
    if GetVolumeInformationByHandleW(handle, nil, 0, nil, nil, nil, out, 256) > 0
      char_pointer_to_ruby_string(out)
    else
      "unknown"
    end
  ensure
    CloseHandle(handle) if close_handle
  end

  def self.identifier_from_io(io)
    FileWatch::FileExt.io_handle(io) do |pointer|
      identifier_from_handle(pointer, false)
    end
  end

  def self.identifier_from_path(path)
    identifier_from_handle(open_handle_from_path(path))
  end

  def self.identifier_from_path_ex(path)
    identifier_from_handle_ex(open_handle_from_path(path))
  end

  def self.identifier_from_io_ex(io)
    FileWatch::FileExt.io_handle(io) do |pointer|
      identifier_from_handle_ex(pointer, false)
    end
  end

  def self.identifier_from_handle_ex(handle, close_handle = true)
    fileIdInfo = Winhelper::FileIdInfo.new
    success = GetFileInformationByHandleEx(handle, :FileIdInfo, fileIdInfo, fileIdInfo.size)
    if success > 0
      vsn   = fileIdInfo[:volumeSerialNumber]
      lpfid = fileIdInfo[:fileId][:lowPart]
      hpfid = fileIdInfo[:fileId][:highPart]
      return "#{vsn}-#{lpfid}-#{hpfid}"
    else
      return 'unknown'
    end
  ensure
    CloseHandle(handle) if close_handle
  end

  def self.identifier_from_handle(handle, close_handle = true)
    fileInfo = Winhelper::FileInformation.new
    success = GetFileInformationByHandle(handle, fileInfo)
    if  success > 0
      #args = [
      #   fileInfo[:fileAttributes], fileInfo[:volumeSerialNumber], fileInfo[:fileSizeHigh], fileInfo[:fileSizeLow],
      #   fileInfo[:numberOfLinks], fileInfo[:fileIndexHigh], fileInfo[:fileIndexLow]
      # ]
      #p "Information: %u %u %u %u %u %u %u " % args
      #this is only guaranteed on NTFS, for ReFS on windows 2012, GetFileInformationByHandleEx should be used with FILE_ID_INFO, which returns a 128 bit identifier
      return "#{fileInfo[:volumeSerialNumber]}-#{fileInfo[:fileIndexLow]}-#{fileInfo[:fileIndexHigh]}"
    else
      return 'unknown'
    end
  ensure
    CloseHandle(handle) if close_handle
  end

  private

  def self.open_handle_from_path(path)
    CreateFileW(utf16le(path), 0, 7, nil, 3, 128, nil)
  end

  def self.char_pointer_to_ruby_string(char_pointer, length = 256)
    bytes = char_pointer.get_array_of_uchar(0, length)
    ignore = bytes.reverse.index{|b| b != 0} - 1
    our_bytes = bytes[0, bytes.length - ignore]
    our_bytes.pack("C*").force_encoding("UTF-16LE").encode("UTF-8")
  end

  def self.utf16le(string)
    to_cstring(string).encode("UTF-16LE")
  end

  def self.to_cstring(rubystring)
    rubystring + 0.chr
  end

  def self.win1252(string)
    string.encode("Windows-1252")
  end
end


#fileId = Winhelper.GetWindowsUniqueFileIdentifier('C:\inetpub\logs\LogFiles\W3SVC1\u_ex1fdsadfsadfasdf30612.log')
#p "FileId: " + fileId
#p "outside function, sleeping"
#sleep(10)
