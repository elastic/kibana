import { handleGithubV3Error } from './apiRequestV3';

describe('handleGithubV3Error', () => {
  it('should return formatted error when pull request already exists', () => {
    const pullRequestAlreadyExistsResponse = {
      message: 'Validation Failed',
      errors: [
        {
          resource: 'PullRequest',
          code: 'custom',
          message:
            'A pull request already exists for sqren:backport/6.3/pr-85.',
        },
      ],
      documentation_url:
        'https://developer.github.com/v3/pulls/#create-a-pull-request',
    };
    const e = getAxiosError(pullRequestAlreadyExistsResponse);
    expect(handleGithubV3Error(e).message).toMatchInlineSnapshot(
      `"Validation Failed: A pull request already exists for sqren:backport/6.3/pr-85. (Github v3)"`
    );
  });

  it('should return formatted error when sha is invalid', () => {
    // GET https://api.github.com/search/commits?q=hash:as%20repo:elastic/kibana
    const invalidShaResponse = {
      message: 'Validation Failed',
      errors: [
        {
          message: 'The given commit SHA is not in a recognized format',
          resource: 'Search',
          field: 'q',
          code: 'invalid',
        },
      ],
      documentation_url: 'https://developer.github.com/v3/search/',
    };
    const e = getAxiosError(invalidShaResponse);
    expect(handleGithubV3Error(e).message).toMatchInlineSnapshot(
      `"Validation Failed: The given commit SHA is not in a recognized format (Github v3)"`
    );
  });
});

function getAxiosError(data: any) {
  const error = new Error();
  // @ts-ignore
  error.response = { data };
  return error as any;
}
