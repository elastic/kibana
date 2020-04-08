#include <ruby.h>
#include "hitimes_interval.h"

/* Module and Classes */
VALUE mH;           /* module Hitimes            */
VALUE eH_Error;     /* class  Hitimes::Error     */


/**
 * call-seq:
 *    Hitimes.raw_instant -> Integer
 *
 * Return the raw instant value from the operating system
 */
VALUE hitimes_instant_raw( )
{
    unsigned long long i = (unsigned long long)hitimes_get_current_instant( );

    return ULL2NUM(i);
}

/*
 * Document-class: Hitimes::Error
 *
 * General error class for the Hitimes module
 */
void Init_hitimes( )
{
    mH = rb_define_module("Hitimes");

    eH_Error = rb_define_class_under(mH, "Error", rb_eStandardError);
    rb_define_const( mH, "INSTANT_CONVERSION_FACTOR", DBL2NUM( HITIMES_INSTANT_CONVERSION_FACTOR ));
    rb_define_module_function( mH, "raw_instant", hitimes_instant_raw, 0 );

    Init_hitimes_interval();
    Init_hitimes_stats( );
}
