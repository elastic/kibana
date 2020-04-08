fails:File.open on a FIFO opens it as a normal file
fails:File.open opens file when call with a block (basic case)
fails:File.open opens a file with mode string and block
fails:File.open opens a file with mode num and block
fails:File.open opens the file when passed mode, num, permissions and block
fails:File.open opens the file when call with fd
fails:File.open opens a file with a file descriptor d and a block
fails:File.open raises a SystemCallError if passed an invalid Integer type
fails:File.open raises an IOError when read in a block opened with File::RDONLY|File::APPEND mode
fails:File.open raises an IOError if the file exists when open with File::RDONLY|File::APPEND
fails:File.open defaults external_encoding to ASCII-8BIT for binary modes
fails:File.open when passed a file descriptor opens a file
fails:File.open when passed a file descriptor opens a file when passed a block
