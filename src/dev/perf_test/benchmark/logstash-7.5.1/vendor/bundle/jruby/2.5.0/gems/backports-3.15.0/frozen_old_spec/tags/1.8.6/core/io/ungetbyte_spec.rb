fails:IO#ungetbyte does nothing when passed nil
fails:IO#ungetbyte puts back each byte in a String argument
fails:IO#ungetbyte calls #to_str to convert the argument
fails:IO#ungetbyte puts back one byte for an Integer argument
