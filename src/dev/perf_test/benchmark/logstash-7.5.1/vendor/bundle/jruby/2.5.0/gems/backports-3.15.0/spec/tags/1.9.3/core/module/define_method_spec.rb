fails:Module#define_method when name is not a special private name given an UnboundMethod and called from the target module sets the visibility of the method to the current visibility
fails:Module#define_method when name is not a special private name given an UnboundMethod and called from another module sets the visibility of the method to public
fails:Module#define_method when name is not a special private name passed a block and called from the target module sets the visibility of the method to the current visibility
fails:Module#define_method does not use the caller block when no block is given
fails:Module#define_method returns its symbol
fails:Module#define_method allows an UnboundMethod from a module to be defined on a class
fails:Module#define_method allows an UnboundMethod from a module to be defined on another unrelated module
