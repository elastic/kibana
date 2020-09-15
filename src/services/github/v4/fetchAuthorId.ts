import { ValidConfigOptions } from '../../../options/options';
import { apiRequestV4 } from './apiRequestV4';

interface DataResponse {
  user: { id: string };
}

export async function fetchAuthorId(options: ValidConfigOptions) {
  const { all, author, accessToken, githubApiBaseUrlV4 } = options;
  if (all) {
    return null;
  }

  const query = /* GraphQL */ `
    query AuthorId($login: String!) {
      user(login: $login) {
        id
      }
    }
  `;

  const res = await apiRequestV4<DataResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: { login: author },
  });

  return res.user.id;
}
