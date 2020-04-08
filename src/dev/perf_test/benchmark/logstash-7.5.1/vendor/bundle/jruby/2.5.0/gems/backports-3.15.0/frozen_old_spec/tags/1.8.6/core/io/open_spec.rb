fails:IO.open uses the external encoding specified in the mode argument
fails:IO.open uses the external and the internal encoding specified in the mode argument
fails:IO.open uses the external encoding specified via the :external_encoding option
fails:IO.open uses the internal encoding specified via the :internal_encoding option
fails:IO.open uses the colon-separated encodings specified via the :encoding option
fails:IO.open ingores the :encoding option when the :external_encoding option is present
fails:IO.open ingores the :encoding option when the :internal_encoding option is present
fails:IO.open uses the encoding specified via the :mode option hash
fails:IO.open ignores the :internal_encoding option when the same as the external encoding
fails:IO.open sets internal encoding to nil when passed '-'
fails:IO.open sets binmode from mode string
fails:IO.open does not set binmode without being asked
fails:IO.open sets binmode from :binmode option
fails:IO.open does not set binmode from false :binmode
fails:IO.open raises an error if passed binary/text mode two ways
fails:IO.open sets external encoding to binary with binmode in mode string
fails:IO.open sets external encoding to binary with :binmode option
fails:IO.open does not use binary encoding when mode encoding is specified
fails:IO.open does not use binary encoding when :encoding option is specified
fails:IO.open does not use binary encoding when :external_encoding option is specified
fails:IO.open does not use binary encoding when :internal_encoding option is specified
fails:IO.open coerces mode with #to_int
fails:IO.open coerces options as second argument with #to_hash
fails:IO.open raises ArgumentError if not passed a hash or nil for options
