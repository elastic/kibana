import {
  getFirstCommitMessageLine,
  getFormattedCommitMessage
} from './commitFormatters';

describe('getFirstCommitMessageLine', () => {
  it('should only return the first line of the message', () => {
    expect(
      getFirstCommitMessageLine(
        'My commit message (#1234)\n\n Additional commit message body'
      )
    ).toEqual('My commit message (#1234)');
  });

  it('should return the commit message as-is', () => {
    expect(getFirstCommitMessageLine('My commit message')).toEqual(
      'My commit message'
    );
  });
});

describe('getFormattedCommitMessage', () => {
  it('should return the first message line verbatim', () => {
    expect(
      getFormattedCommitMessage({
        message: 'This is my commit message (#1234)\n\nthis is a second line',
        pullNumber: 1234,
        sha: 'sha123456789'
      })
    ).toBe('This is my commit message (#1234)');
  });

  it('should add pullNumber as suffix', () => {
    expect(
      getFormattedCommitMessage({
        message: 'This is my commit message\n\nthis is a second line',
        pullNumber: 1234,
        sha: 'sha123456789'
      })
    ).toBe('This is my commit message (#1234)');
  });

  it('should add commit sha as suffix', () => {
    expect(
      getFormattedCommitMessage({
        message: 'This is my commit message\n\nthis is a second line',
        sha: 'sha123456789'
      })
    ).toBe('This is my commit message (sha12345)');
  });
});
