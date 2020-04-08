package hitimes;

import java.lang.Math;
import java.lang.System;

import org.jruby.Ruby;
import org.jruby.RubyClass;
import org.jruby.RubyException;
import org.jruby.RubyModule;
import org.jruby.RubyObject;
import org.jruby.anno.JRubyClass;
import org.jruby.anno.JRubyMethod;
import org.jruby.anno.JRubyModule;
import org.jruby.anno.JRubyConstant;
import org.jruby.exceptions.RaiseException;
import org.jruby.runtime.ThreadContext;
import org.jruby.runtime.Visibility;
import org.jruby.runtime.builtin.IRubyObject;


/**
 * @author <a href="mailto:jeremy@hinegardner.org">Jeremy Hinegardner</a>
 */
@JRubyModule( name = "Hitimes" )
public class Hitimes {

    public static final double INSTANT_CONVERSION_FACTOR = 1000000000d;

    public static RubyClass hitimesIntervalClass;
    
    /**
     * Create the Hitimes module and add it to the Ruby runtime.
     */
    public static RubyModule createHitimesModule( Ruby runtime ) {
        RubyModule mHitimes = runtime.defineModule("Hitimes");
        mHitimes.defineConstant("INSTANT_CONVERSION_FACTOR", runtime.newFloat(INSTANT_CONVERSION_FACTOR));
        mHitimes.defineAnnotatedMethods( Hitimes.class );

        RubyClass  cStandardError = runtime.getStandardError();
        RubyClass  cHitimesError  = mHitimes.defineClassUnder("Error", cStandardError, cStandardError.getAllocator());

        RubyClass  cHitimesStats  = mHitimes.defineClassUnder("Stats", runtime.getObject(), HitimesStats.ALLOCATOR );
        cHitimesStats.defineAnnotatedMethods( HitimesStats.class );

        RubyClass  cHitimesInterval  = mHitimes.defineClassUnder("Interval", runtime.getObject(), HitimesInterval.ALLOCATOR );
        Hitimes.hitimesIntervalClass = cHitimesInterval;
        cHitimesInterval.defineAnnotatedMethods( HitimesInterval.class );

        return mHitimes;
    }

    static RaiseException newHitimesError( Ruby runtime, String message ) {
        RubyClass errorClass = runtime.getModule("Hitimes").getClass( "Error" );
        return new RaiseException( RubyException.newException( runtime, errorClass, message ), true );
    }


    @JRubyMethod( name = "raw_instant", module = true )
    public static IRubyObject rawInstant(ThreadContext context, IRubyObject self) {
        return context.runtime.newFixnum( System.nanoTime() );
    }

}
