FILE = css-color-names.json

all:
	./getcolors.sh | ./stringify.js > $(FILE)
clean:
	rm -f $(FILE)

.PHONY: all clean
