# target is the final output for your library
TARGET=k4.js
SRC_FILES=$(shell find src -type f -name "*.js")
BUILD_OPTIONS=build/build.js
RJS=node_modules/.bin/r.js

all: build

build: $(TARGET)

clean:
	rm -rf $(TARGET) node_modules

$(TARGET): $(RJS)
	$(RJS) -o $(BUILD_OPTIONS) out=$(TARGET)

$(RJS):
	npm install