import expect from 'expect.js';
import Boom from 'boom';
import handleESError from '../handle_es_error';
import { errors as esErrors } from 'elasticsearch';

describe('handleESError', function () {

  it('should transform elasticsearch errors into boom errors with the same status code', function () {
    const conflict = handleESError(new esErrors.Conflict());
    expect(conflict.isBoom).to.be(true);
    expect(conflict.output.statusCode).to.be(409);

    const forbidden = handleESError(new esErrors[403]);
    expect(forbidden.isBoom).to.be(true);
    expect(forbidden.output.statusCode).to.be(403);

    const notFound = handleESError(new esErrors.NotFound());
    expect(notFound.isBoom).to.be(true);
    expect(notFound.output.statusCode).to.be(404);

    const badRequest = handleESError(new esErrors.BadRequest());
    expect(badRequest.isBoom).to.be(true);
    expect(badRequest.output.statusCode).to.be(400);
  });

  it('should return an unknown error without transforming it', function () {
    const unknown = new Error('mystery error');
    expect(handleESError(unknown)).to.be(unknown);
  });

  it('should return a boom 503 server timeout error for ES connection errors', function () {
    expect(handleESError(new esErrors.ConnectionFault()).output.statusCode).to.be(503);
    expect(handleESError(new esErrors.ServiceUnavailable()).output.statusCode).to.be(503);
    expect(handleESError(new esErrors.NoConnections()).output.statusCode).to.be(503);
    expect(handleESError(new esErrors.RequestTimeout()).output.statusCode).to.be(503);
  });

  it('should throw an error if called with a non-error argument', function () {
    expect(handleESError).withArgs('notAnError').to.throwException();
  });
});
