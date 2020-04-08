package com.jrjackson;

import org.jruby.Ruby;
import org.jruby.RubyModule;
import org.jruby.RubyClass;
import org.jruby.runtime.load.BasicLibraryService;

import java.io.IOException;

public class JrJacksonService implements BasicLibraryService {

    @Override
    public boolean basicLoad(final Ruby ruby) throws IOException {
        RubyModule jr_jackson = ruby.defineModule("JrJackson");

        RubyModule jr_jackson_base = ruby.defineModuleUnder("Base", jr_jackson);
        jr_jackson_base.defineAnnotatedMethods(JrJacksonBase.class);

        RubyModule jr_jackson_raw = ruby.defineModuleUnder("Raw", jr_jackson);
        jr_jackson_raw.defineAnnotatedMethods(JrJacksonRaw.class);

        RubyModule jr_jackson_ruby = ruby.defineModuleUnder("Ruby", jr_jackson);
        jr_jackson_ruby.defineAnnotatedMethods(JrJacksonRuby.class);
        
        RubyModule jr_jackson_java = ruby.defineModuleUnder("Java", jr_jackson);
        jr_jackson_java.defineAnnotatedMethods(JrJacksonJava.class);
        
        RubyModule jr_jackson_saj = ruby.defineModuleUnder("Saj", jr_jackson);
        jr_jackson_saj.defineAnnotatedMethods(JrJacksonSaj.class);
        
        RubyModule jr_jackson_sch = ruby.defineModuleUnder("Sch", jr_jackson);
        jr_jackson_sch.defineAnnotatedMethods(JrJacksonSch.class);
        
        RubyClass runtimeError = ruby.getRuntimeError();
        RubyClass parseError = jr_jackson.defineClassUnder("ParseError", runtimeError, runtimeError.getAllocator());
        return true;
    }
}
