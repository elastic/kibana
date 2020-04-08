// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

#include <ruby.h>
#if defined(__sun)
#include <atomic.h>
#endif

#ifdef HAVE_LIBKERN_OSATOMIC_H
#include <libkern/OSAtomic.h>
#endif

static void ir_mark(void *value) {
    rb_gc_mark_maybe((VALUE) value);
}

static VALUE ir_alloc(VALUE klass) {
    return rb_data_object_alloc(klass, (void *) Qnil, ir_mark, NULL);
}

static VALUE ir_initialize(int argc, VALUE* argv, VALUE self) {
    VALUE value = Qnil;
    if (rb_scan_args(argc, argv, "01", &value) == 1) {
	value = argv[0];
    }
    DATA_PTR(self) = (void *) value;
    return Qnil;
}

static VALUE ir_get(VALUE self) {
#if HAVE_GCC_SYNC
    __sync_synchronize();
#elif defined _MSC_VER
    MemoryBarrier();
#elif __ENVIRONMENT_MAC_OS_X_VERSION_MIN_REQUIRED__ >= 1050
    OSMemoryBarrier();
#endif
    return (VALUE) DATA_PTR(self);
}

static VALUE ir_set(VALUE self, VALUE new_value) {
    DATA_PTR(self) = (void *) new_value;
#if HAVE_GCC_SYNC
    __sync_synchronize();
#elif defined _MSC_VER
    MemoryBarrier();
#elif __ENVIRONMENT_MAC_OS_X_VERSION_MIN_REQUIRED__ >= 1050
    OSMemoryBarrier();
#endif
    return new_value;
}

static VALUE ir_get_and_set(VALUE self, VALUE new_value) {
    VALUE old_value = ir_get(self);
    ir_set(self, new_value);
    return old_value;
}

static VALUE ir_compare_and_set(volatile VALUE self, VALUE expect_value, VALUE new_value) {
#if __ENVIRONMENT_MAC_OS_X_VERSION_MIN_REQUIRED__ >= 1050
    if (OSAtomicCompareAndSwap64(expect_value, new_value, &DATA_PTR(self))) {
	return Qtrue;
    }
#elif defined(__sun)
/*  Assuming VALUE is uintptr_t */
/*  Based on the definition of uintptr_t from /usr/include/sys/int_types.h */
#if defined(_LP64) || defined(_I32LPx)
    /*  64-bit: uintptr_t === unsigned long */
    if (atomic_cas_ulong((uintptr_t *) &DATA_PTR(self), expect_value, new_value)) {
        return Qtrue;
    }
#else
    /*  32-bit: uintptr_t === unsigned int */
    if (atomic_cas_uint((uintptr_t *) &DATA_PTR(self), expect_value, new_value)) {
        return Qtrue;
    }
#endif
#elif defined _MSC_VER && defined _M_AMD64
    if (InterlockedCompareExchange64((LONGLONG*)&DATA_PTR(self), new_value, expect_value)) {
	return Qtrue;
    }
#elif defined _MSC_VER && defined _M_IX86
    if (InterlockedCompareExchange((LONG*)&DATA_PTR(self), new_value, expect_value)) {
	return Qtrue;
    }
#else
    if (__sync_bool_compare_and_swap(&DATA_PTR(self), expect_value, new_value)) {
	return Qtrue;
    }
#endif
    return Qfalse;
}

void Init_atomic_reference() {
    VALUE cAtomic;

    cAtomic = rb_define_class_under(rb_cObject, "Atomic", rb_cObject);

    rb_define_alloc_func(cAtomic, ir_alloc);

    rb_define_method(cAtomic, "initialize", ir_initialize, -1);
    rb_define_method(cAtomic, "get", ir_get, 0);
    rb_define_method(cAtomic, "value", ir_get, 0);
    rb_define_method(cAtomic, "set", ir_set, 1);
    rb_define_method(cAtomic, "value=", ir_set, 1);
    rb_define_method(cAtomic, "get_and_set", ir_get_and_set, 1);
    rb_define_method(cAtomic, "swap", ir_get_and_set, 1);
    rb_define_method(cAtomic, "compare_and_set", ir_compare_and_set, 2);
    rb_define_method(cAtomic, "compare_and_swap", ir_compare_and_set, 2);
}
