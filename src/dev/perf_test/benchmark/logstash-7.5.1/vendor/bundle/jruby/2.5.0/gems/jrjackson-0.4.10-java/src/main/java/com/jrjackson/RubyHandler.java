package com.jrjackson;

import com.fasterxml.jackson.core.JsonParser;
import java.io.IOException;
import org.jruby.Ruby;
import org.jruby.RubyArray;
import org.jruby.RubyHash;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.builtin.IRubyObject;

/**
 *
 * @author Guy Boertje
 */
public class RubyHandler implements IParseHandler<IRubyObject, RubyArray, RubyHash> {

    private final Ruby _ruby;
    private final ThreadContext _ctx;
    private final RubyNameConverter _keyConv;
    private final RubyConverter _intConv;
    private final RubyConverter _floatConv;
    private final RubyConverter _strConv;
    private IRubyObject _result;

    public RubyHandler(ThreadContext ctx,
            RubyNameConverter keyConverter,
            RubyConverter intConverter,
            RubyConverter floatConverter) {

        _ctx = ctx;
        _ruby = ctx.runtime;
        _keyConv = keyConverter;
        _intConv = intConverter;
        _floatConv = floatConverter;
        _strConv = new RubyStringConverter();
    }

    @Override
    public void addValue(IRubyObject value) {

        _result = value;
    }

    @Override
    public IRubyObject hashStart() {
        return RubyHash.newHash(_ruby);
    }

    @Override
    public void hashEnd() {

    }

    @Override
    public IRubyObject hashKey(String key) {
        return _keyConv.convert(_ruby, key);
    }

    @Override
    public void hashSet(RubyHash hash, IRubyObject key, IRubyObject value) {
        hash.fastASet(key, value);
    }

    @Override
    public IRubyObject arrayStart() {
        return RubyArray.newArray(_ruby);
    }

    @Override
    public void arrayEnd() {

    }

    @Override
    public void arrayAppend(RubyArray array, IRubyObject value) {
        array.append(value);
    }

    @Override
    public IRubyObject treatNull() {
        return _ctx.nil;
    }

    @Override
    public IRubyObject treatInt(JsonParser jp) throws IOException {
        return _intConv.convert(_ruby, jp);
    }

    @Override
    public IRubyObject treatFloat(JsonParser jp) throws IOException {
        return _floatConv.convert(_ruby, jp);
    }

    @Override
    public IRubyObject treatString(JsonParser jp) throws IOException {
        return _strConv.convert(_ruby, jp);
    }

    @Override
    public IRubyObject trueValue() {
        return _ruby.newBoolean(true);
    }

    @Override
    public IRubyObject falseValue() {
        return _ruby.newBoolean(false);
    }

    @Override
    public IRubyObject getResult() {
        return _result == null ? _ctx.nil : _result;
    }

    @Override
    public void raiseError(String e) {
        throw ParseError.newParseError(_ruby, e);
    }

}
