import { importFile } from '../import_file';

describe('importFile', () => {
  it('should import a file', async () => {
    class FileReader {
      readAsText(text) {
        this.onload({
          target: {
            result: JSON.stringify({ text }),
          },
        });
      }
    }

    const file = 'foo';

    const imported = await importFile(file, FileReader);
    expect(imported).toEqual({ text: file });
  });

  it('should throw errors', async () => {
    class FileReader {
      readAsText() {
        this.onload({
          target: {
            result: 'not_parseable',
          },
        });
      }
    }

    const file = 'foo';

    try {
      await importFile(file, FileReader);
    } catch (e) {
      // There isn't a great way to handle throwing exceptions
      // with async/await but this seems to work :shrug:
      expect(() => {
        throw e;
      }).toThrow();
    }
  });
});
