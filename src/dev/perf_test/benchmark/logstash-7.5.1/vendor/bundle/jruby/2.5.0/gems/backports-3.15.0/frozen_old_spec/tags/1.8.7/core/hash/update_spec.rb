fails:Hash#update raises a RuntimeError on a frozen instance that is modified
fails:Hash#update checks frozen status before coercing an object with #to_hash
fails:Hash#update raises a RuntimeError on a frozen instance that would not be modified
