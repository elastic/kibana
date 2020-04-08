fails:String#setbyte allows changing bytes in multi-byte characters
fails:String#setbyte can invalidate a String's encoding
fails:String#setbyte sets a byte at an index greater than String size
fails:String#setbyte raises a RuntimeError if self is frozen
fails:String#setbyte raises a TypeError unless the second argument is an Integer
