import gql from 'graphql-tag';
import { apiRequestV4 } from './apiRequestV4';

export interface AuthorIdResponse {
  user: { id: string };
}

export async function fetchAuthorId({
  accessToken,
  author,
  githubApiBaseUrlV4 = 'https://api.github.com/graphql',
}: {
  accessToken: string;
  author: string | null;
  githubApiBaseUrlV4?: string;
}) {
  if (author === null) {
    return null;
  }

  const query = gql`
    query AuthorId($author: String!) {
      user(login: $author) {
        id
      }
    }
  `;

  const res = await apiRequestV4<AuthorIdResponse>({
    githubApiBaseUrlV4,
    accessToken,
    query,
    variables: { author },
  });

  return res.user.id;
}
