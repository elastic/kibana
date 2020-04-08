fails:Hash#merge! raises a RuntimeError on a frozen instance that is modified
fails:Hash#merge! checks frozen status before coercing an object with #to_hash
fails:Hash#merge! raises a RuntimeError on a frozen instance that would not be modified
