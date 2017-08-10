import expect from 'expect.js';
import sinon from 'sinon';
import shortUrlLookupProvider from '../short_url_lookup';
import { SavedObjectsClient } from '../../saved_objects/client';

describe('shortUrlLookupProvider', () => {
  const ID = 'bf00ad16941fc51420f91a93428b27a0';
  const TYPE = 'url';
  const URL = 'http://elastic.co';
  const server = { log: sinon.stub() };
  const sandbox = sinon.sandbox.create();

  let savedObjectsClient;
  let req;
  let shortUrl;

  beforeEach(() => {
    savedObjectsClient = {
      get: sandbox.stub(),
      create: sandbox.stub().returns(Promise.resolve({ id: ID })),
      update: sandbox.stub(),
      errors: SavedObjectsClient.errors
    };

    req = { getSavedObjectsClient: () => savedObjectsClient };
    shortUrl = shortUrlLookupProvider(server);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('generateUrlId', () => {
    it('returns the document id', async () => {
      const id = await shortUrl.generateUrlId(URL, req);
      expect(id).to.eql(ID);
    });

    it('provides correct arguments to savedObjectsClient', async () => {
      await shortUrl.generateUrlId(URL, req);

      sinon.assert.calledOnce(savedObjectsClient.create);
      const [type, attributes, options] = savedObjectsClient.create.getCall(0).args;

      expect(type).to.eql(TYPE);
      expect(attributes).to.only.have.keys('url', 'accessCount', 'createDate', 'accessDate');
      expect(attributes.url).to.eql(URL);
      expect(options.id).to.eql(ID);
    });

    it('passes persists attributes', async () => {
      await shortUrl.generateUrlId(URL, req);

      sinon.assert.calledOnce(savedObjectsClient.create);
      const [type, attributes] = savedObjectsClient.create.getCall(0).args;

      expect(type).to.eql(TYPE);
      expect(attributes).to.only.have.keys('url', 'accessCount', 'createDate', 'accessDate');
      expect(attributes.url).to.eql(URL);
    });

    it('gracefully handles version conflict', async () => {
      const error = savedObjectsClient.errors.decorateConflictError(new Error());
      savedObjectsClient.create.throws(error);
      const id = await shortUrl.generateUrlId(URL, req);
      expect(id).to.eql(ID);
    });
  });

  describe('getUrl', () => {
    beforeEach(() => {
      const attributes = { accessCount: 2, url: URL };
      savedObjectsClient.get.returns({ id: ID, attributes });
    });

    it('provides the ID to savedObjectsClient', async () => {
      await shortUrl.getUrl(ID, req);

      sinon.assert.calledOnce(savedObjectsClient.get);
      const [type, id] = savedObjectsClient.get.getCall(0).args;

      expect(type).to.eql(TYPE);
      expect(id).to.eql(ID);
    });

    it('returns the url', async () => {
      const response = await shortUrl.getUrl(ID, req);
      expect(response).to.eql(URL);
    });

    it('increments accessCount', async () => {
      await shortUrl.getUrl(ID, req);

      sinon.assert.calledOnce(savedObjectsClient.update);
      const [type, id, attributes] = savedObjectsClient.update.getCall(0).args;

      expect(type).to.eql(TYPE);
      expect(id).to.eql(ID);
      expect(attributes).to.only.have.keys('accessCount', 'accessDate');
      expect(attributes.accessCount).to.eql(3);
    });
  });
});
