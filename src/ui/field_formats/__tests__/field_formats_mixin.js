import expect from 'expect.js';
import sinon from 'sinon';

import { FieldFormat } from '../field_format';
import * as FieldFormatsServiceNS from '../field_formats_service';
import { createServer } from '../../../test_utils/kbn_server';

describe('server.registerFieldFormat(createFormat)', () => {
  const sandbox = sinon.sandbox.create();

  let server;
  beforeEach(async () => {
    const kbnServer = createServer();
    await kbnServer.ready();
    server = kbnServer.server;
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('throws if createFormat is not a function', () => {
    expect(() => server.registerFieldFormat()).to.throwError(error => {
      expect(error.message).to.match(/createFormat is not a function/i);
    });
  });

  it('calls the createFormat() function with the FieldFormat class', () => {
    const createFormat = sinon.stub();
    server.registerFieldFormat(createFormat);
    sinon.assert.calledOnce(createFormat);
    sinon.assert.calledWithExactly(createFormat, sinon.match.same(FieldFormat));
  });

  it('passes the returned class to the FieldFormatsService', async () => {
    const { FieldFormatsService: ActualFFS } = FieldFormatsServiceNS;
    sinon.stub(FieldFormatsServiceNS, 'FieldFormatsService', function (...args) {
      return new ActualFFS(...args);
    });

    const { FieldFormatsService } = FieldFormatsServiceNS;
    class FooFormat {
      static id = 'foo'
    }
    server.registerFieldFormat(() => FooFormat);

    const fieldFormats = await server.fieldFormatServiceFactory({
      getAll: () => ({}),
      getDefaults: () => ({})
    });

    sinon.assert.calledOnce(FieldFormatsService);
    sinon.assert.calledWithExactly(
      FieldFormatsService,
      // array of fieldFormat classes
      [sinon.match.same(FooFormat)],
      // getConfig() function
      sinon.match.func
    );

    const format = fieldFormats.getInstance({ id: 'foo' });
    expect(format).to.be.a(FooFormat);
  });
});
