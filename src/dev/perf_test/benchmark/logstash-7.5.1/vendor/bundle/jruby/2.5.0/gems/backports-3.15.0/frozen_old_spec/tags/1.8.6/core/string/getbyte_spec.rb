fails:String#getbyte returns an Integer between 0 and 255
fails:String#getbyte regards a multi-byte character as having multiple bytes
fails:String#getbyte mirrors the output of #bytes
fails:String#getbyte interprets bytes relative to the String's encoding
fails:String#getbyte raises an ArgumentError unless given one argument
fails:String#getbyte raises a TypeError unless its argument can be coerced into an Integer
