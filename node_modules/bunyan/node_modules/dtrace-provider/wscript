import Options, Utils, sys
from os import unlink, symlink, popen
from os.path import exists, islink

srcdir = '.'
blddir = 'build'
VERSION = '0.2.8'

libusdtdir = 'libusdt' 

def set_options(ctx):
    ctx.tool_options('compiler_cxx')

def configure(ctx):
    ctx.check_tool('compiler_cxx')
    ctx.check_tool('node_addon')

def build(ctx):
    if sys.platform.startswith("sunos") or sys.platform.startswith("darwin") or sys.platform.startswith("freebsd"):
        ctx.new_task_gen(
            rule = "cd ../" + libusdtdir + " && ARCH=i386 make clean all && cd -",
            shell = True
            )
        
        t = ctx.new_task_gen('cxx', 'shlib', 'node_addon')
        t.target = 'DTraceProviderBindings'
        t.source = ['dtrace_provider.cc', 'dtrace_probe.cc', 'dtrace_argument.cc']
        t.includes = [libusdtdir]
        t.staticlib = 'usdt'
        t.libpath = "../" + libusdtdir
