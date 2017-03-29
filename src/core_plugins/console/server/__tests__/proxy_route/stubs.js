import { Readable } from 'stream';

export function createWreckResponseStub(response) {
  return (...args) => {
    const resp = new Readable({
      read() {
        if (response) {
          this.push(response);
        }
        this.push(null);
      }
    });

    resp.statusCode = 200;
    resp.statusMessage = 'OK';
    resp.headers = {
      'content-type': 'text/plain',
      'content-length': String(response ? response.length : 0)
    };

    args.pop()(null, resp);
  };
}
