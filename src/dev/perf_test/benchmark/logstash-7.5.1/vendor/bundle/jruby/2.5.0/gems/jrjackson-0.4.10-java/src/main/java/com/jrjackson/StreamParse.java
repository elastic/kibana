package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.internal.runtime.methods.DynamicMethod;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;
import org.jruby.exceptions.RaiseException;

/**
 *
 * @author Guy Boertje
 */
public abstract class StreamParse {

    protected final ThreadContext _ctx;
    protected final Ruby _ruby;
    protected final IRubyObject _handler;
    protected final RubyClass _meta;
    protected final RubyStringConverter keyConverter = new RubyStringConverter();
    
    protected final DynamicMethod _hash_start;
    protected final boolean _no_hash_start;

    protected final DynamicMethod _hash_end;
    protected final boolean _no_hash_end;

    protected final DynamicMethod _array_start;
    protected final boolean _no_array_start;

    protected final DynamicMethod _array_end;
    protected final boolean _no_array_end;
    
    protected final DynamicMethod _add_value;
    protected final boolean _no_add_value;

    public StreamParse(ThreadContext ctx, IRubyObject handler)
            throws RaiseException {

        _ctx = ctx;
        _ruby = ctx.runtime;
        _handler = handler;
        _meta = _handler.getMetaClass();
        
        _add_value = _meta.searchMethod("add_value");
        _no_add_value = _add_value.isUndefined();

        _hash_start = _meta.searchMethod("hash_start");
        _no_hash_start = _hash_start.isUndefined();

        _hash_end = _meta.searchMethod("hash_end");
        _no_hash_end = _hash_end.isUndefined();

        _array_start = _meta.searchMethod("array_start");
        _no_array_start = _array_start.isUndefined();

        _array_end = _meta.searchMethod("array_end");
        _no_array_end = _array_end.isUndefined();

    }
    
    public abstract IRubyObject deserialize(JsonParser jp) 
            throws RaiseException;
}
