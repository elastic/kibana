cmd_Release/obj.target/sandbox_linux/native/sandbox_linux.o := g++ '-DNODE_GYP_MODULE_NAME=sandbox_linux' '-DUSING_UV_SHARED=1' '-DUSING_V8_SHARED=1' '-DV8_DEPRECATION_WARNINGS=1' '-D_LARGEFILE_SOURCE' '-D_FILE_OFFSET_BITS=64' '-DBUILDING_NODE_EXTENSION' -I/home/vagrant/.node-gyp/8.9.4/include/node -I/home/vagrant/.node-gyp/8.9.4/src -I/home/vagrant/.node-gyp/8.9.4/deps/uv/include -I/home/vagrant/.node-gyp/8.9.4/deps/v8/include  -fPIC -pthread -Wall -Wextra -Wno-unused-parameter -m64 -O3 -fno-omit-frame-pointer -fno-rtti -fno-exceptions -std=gnu++0x -MMD -MF ./Release/.deps/Release/obj.target/sandbox_linux/native/sandbox_linux.o.d.raw   -c -o Release/obj.target/sandbox_linux/native/sandbox_linux.o ../native/sandbox_linux.cpp
Release/obj.target/sandbox_linux/native/sandbox_linux.o: \
 ../native/sandbox_linux.cpp ../native/sandbox.hpp
../native/sandbox_linux.cpp:
../native/sandbox.hpp:
