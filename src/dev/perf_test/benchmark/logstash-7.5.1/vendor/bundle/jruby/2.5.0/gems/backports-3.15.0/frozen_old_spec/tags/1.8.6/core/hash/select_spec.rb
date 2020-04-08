fails:Hash#select returns a Hash of entries for which block is true
fails:Hash#select! is equivalent to keep_if if changes are made
fails:Hash#select! returns nil if no changes were made
fails:Hash#select! raises a RuntimeError if called on an empty frozen instance
fails:Hash#select! raises a RuntimeError if called on a frozen instance that would not be modified
fails:Hash#select! returns an Enumerator if called on a non-empty hash without a block
fails:Hash#select! returns an Enumerator if called on an empty hash without a block
fails:Hash#select! returns an Enumerator if called on a frozen instance
