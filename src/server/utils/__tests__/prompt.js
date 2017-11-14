import expect from 'expect.js';
import sinon from 'sinon';
import { PassThrough } from 'stream';

import { confirm, question } from '../prompt';

describe('prompt', () => {
  const sandbox = sinon.sandbox.create();

  let input;
  let output;

  beforeEach(() => {
    input = new PassThrough();
    output = new PassThrough();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('confirm', () => {
    it('prompts for question', async () => {
      const onData = sandbox.stub(output, 'write');

      confirm('my question', { output });

      sinon.assert.calledOnce(onData);

      const { args } = onData.getCall(0);
      expect(args[0]).to.eql('my question [y/N] ');
    });

    it('prompts for question with default true', async () => {
      const onData = sandbox.stub(output, 'write');

      confirm('my question', { output, default: true });

      sinon.assert.calledOnce(onData);

      const { args } = onData.getCall(0);
      expect(args[0]).to.eql('my question [Y/n] ');
    });

    it('defaults to false', async () => {
      process.nextTick(() => input.write('\n'));

      const answer = await confirm('my question', { output, input });
      expect(answer).to.be(false);
    });

    it('accepts "y"', async () => {
      process.nextTick(() => input.write('y\n'));

      const answer = await confirm('my question', { output, input });
      expect(answer).to.be(true);
    });

    it('accepts "Y"', async () => {
      process.nextTick(() => input.write('Y\n'));

      const answer = await confirm('my question', { output, input });
      expect(answer).to.be(true);
    });

    it('accepts "yes"', async () => {
      process.nextTick(() => input.write('yes\n'));

      const answer = await confirm('my question', { output, input });
      expect(answer).to.be(true);
    });

    it('is false when unknown', async () => {
      process.nextTick(() => input.write('unknown\n'));

      const answer = await confirm('my question', { output, input });
      expect(answer).to.be(false);
    });
  });

  describe('question', () => {
    it('prompts for question', async () => {
      const onData = sandbox.stub(output, 'write');

      question('my question', { output });

      sinon.assert.calledOnce(onData);

      const { args } = onData.getCall(0);
      expect(args[0]).to.eql('my question: ');
    });

    it('can be answered', async () => {
      process.nextTick(() => input.write('my answer\n'));

      const answer = await question('my question', { input, output });
      expect(answer).to.be('my answer');
    });
  });
});
