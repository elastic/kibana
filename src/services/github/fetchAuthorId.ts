import { BackportOptions } from '../../options/options';
import { gqlRequest } from './gqlRequest';

interface DataResponse {
  user: { id: string };
}

export async function fetchAuthorId(options: BackportOptions) {
  const { all, author, accessToken, githubApiBaseUrlV4 } = options;
  if (all) {
    return null;
  }

  const query = /* GraphQL */ `
    query getIdByLogin($login: String!) {
      user(login: $login) {
        id
      }
    }
  `;

  const res = await gqlRequest<DataResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: { login: author },
  });

  return res.user.id;
}
