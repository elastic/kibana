fails:Numeric#step Numeric#step with [stop, +step] when self, stop or step is a Float is careful about not yielding a value greater than limit
fails:Numeric#step Numeric#step with [stop, -step] when self, stop or step is a Float is careful about not yielding a value smaller than limit
fails:Numeric#step Numeric#step with [stop, +Infinity] yields once if self < stop
fails:Numeric#step Numeric#step with [stop, +Infinity] yields once when stop is Infinity
fails:Numeric#step Numeric#step with [stop, +Infinity] yields once when self equals stop
fails:Numeric#step Numeric#step with [stop, +Infinity] yields once when self and stop are Infinity
fails:Numeric#step Numeric#step with [stop, +Infinity] does not yield when self > stop
fails:Numeric#step Numeric#step with [stop, -infinity] yields once if self > stop
fails:Numeric#step Numeric#step with [stop, -infinity] yields once if stop is -Infinity
fails:Numeric#step Numeric#step with [stop, -infinity] yields once when self equals stop
fails:Numeric#step Numeric#step with [stop, -infinity] yields once when self and stop are Infinity
fails:Numeric#step Numeric#step with [stop, -infinity] does not yield when self > stop
