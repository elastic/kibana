import { getDevAccessToken } from '../../private/getDevAccessToken';
import { runBackportViaCli } from './runBackportViaCli';
const accessToken = getDevAccessToken();

describe('repo-with-backportrc-removed (missing .backportrc.json config file)', () => {
  it('should list commits', async () => {
    const output = await runBackportViaCli(
      [
        '--branch=foo',
        '--repo=backport-org/repo-with-backportrc-removed',
        `--accessToken=${accessToken}`,
      ],
      { waitForString: 'Select commit' }
    );

    expect(output).toMatchInlineSnapshot(`
        "? Select commit (Use arrow keys)
        ❯ 1. Rename README.me to README.md
          2. Merge pull request #1 from backport-org/add-readme
          3. Create README.me
          4. Delete .backportrc.json
          5. Create .backportrc.json
          6. Delete .backportrc.json
          7. Create .backportrc.json"
      `);
  });

  it('should attempt to backport by PR', async () => {
    const output = await runBackportViaCli(
      [
        '--branch=foo',
        '--repo=backport-org/repo-with-backportrc-removed',
        '--pr=1',
        `--accessToken=${accessToken}`,
      ],
      { waitForString: "is invalid or doesn't exist" }
    );

    expect(output).toMatchInlineSnapshot(`
        "
        Backporting to foo:
        The branch \\"foo\\" is invalid or doesn't exist"
      `);
  });

  it('should attempt to backport by commit sha', async () => {
    const output = await runBackportViaCli(
      [
        '--branch=foo',
        '--repo=backport-org/repo-with-backportrc-removed',
        '--sha=be59df6912a550c8cb49ba3e18be3e512f3d608c',
        `--accessToken=${accessToken}`,
      ],
      { waitForString: `Backporting to foo:` }
    );

    expect(output).toMatchInlineSnapshot(`
        "
        Backporting to foo:"
      `);
  });
});
