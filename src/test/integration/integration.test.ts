import { once } from 'lodash';
import { getOptions } from '../../options/options';
import { runWithOptions } from '../../runWithOptions';
import { createSpies } from './createSpies';
import { REMOTE_ORIGIN_REPO_PATH, REMOTE_FORK_REPO_PATH } from './envConstants';
import {
  getBranches,
  getLatestCommit,
  deleteAndSetupEnvironment,
} from './helpers';

jest.unmock('make-dir');
jest.unmock('del');
jest.unmock('../../services/child-process-promisified');

describe('when a single commit is backported', () => {
  let spies: ReturnType<typeof createSpies>;

  beforeEach(
    once(async () => {
      jest.clearAllMocks();
      spies = createSpies({ commitCount: 1 });

      await deleteAndSetupEnvironment();

      const options = await getOptions([]);
      await runWithOptions(options);
    })
  );

  it('should create PR for forked branch', () => {
    const { createTargetPullRequestPayload } = spies.getSpyCalls();
    expect(createTargetPullRequestPayload.head).toBe(
      'sqren:backport/6.0/pr-85'
    );
  });

  it('should call logger correctly', () => {
    const { loggerCalls } = spies.getSpyCalls();
    expect(loggerCalls).toMatchSnapshot();
  });

  it('should make correct API requests', () => {
    const {
      getDefaultRepoBranchAndPerformStartupChecks,
      getAuthorRequestConfig,
      getCommitsRequestConfig,
      createTargetPullRequestPayload,
    } = spies.getSpyCalls();

    expect(getDefaultRepoBranchAndPerformStartupChecks).toMatchSnapshot();
    expect(getAuthorRequestConfig).toMatchSnapshot();
    expect(getCommitsRequestConfig).toMatchSnapshot();
    expect(createTargetPullRequestPayload).toMatchSnapshot();
  });

  it('should not create new branches in origin (elastic/backport-demo)', async () => {
    const branches = await getBranches(REMOTE_ORIGIN_REPO_PATH);
    expect(branches).toEqual(['6.0', '* master']);
  });

  it('should create branch in the fork (sqren/backport-demo)', async () => {
    const branches = await getBranches(REMOTE_FORK_REPO_PATH);
    expect(branches).toEqual(['6.0', 'backport/6.0/pr-85', '* master']);
  });

  it('should have cherry picked the correct commit', async () => {
    const commit = await getLatestCommit({
      branch: 'backport/6.0/pr-85',
      commitCount: 1,
      cwd: REMOTE_FORK_REPO_PATH,
    });
    expect(commit).toMatchInlineSnapshot(`
      " romeo-and-juliet.txt | 2 +-
       1 file changed, 1 insertion(+), 1 deletion(-)

      diff --git a/romeo-and-juliet.txt b/romeo-and-juliet.txt
      index 87f1ac7..51e1e4b 100644
      --- a/romeo-and-juliet.txt
      +++ b/romeo-and-juliet.txt
      @@ -158 +158 @@ Thereto prick'd on by a most emulate pride,
      -Dared to the combat; in which our valiant Hamlet--
      +Dared to the combat; in 🧙‍♀️ our valiant Hamlet--
      "
    `);
  });
});

describe('when a multiple commits are backported', () => {
  let spies: ReturnType<typeof createSpies>;

  beforeEach(
    once(async () => {
      jest.clearAllMocks();
      spies = createSpies({ commitCount: 2 });

      await deleteAndSetupEnvironment();

      const options = await getOptions([]);
      await runWithOptions(options);
    })
  );

  it('should make correct API requests', () => {
    const {
      getAuthorRequestConfig,
      getCommitsRequestConfig,
      createTargetPullRequestPayload,
    } = spies.getSpyCalls();

    expect(getAuthorRequestConfig).toMatchSnapshot();
    expect(getCommitsRequestConfig).toMatchSnapshot();
    expect(createTargetPullRequestPayload).toMatchSnapshot();
  });

  it('should not create new branches in origin (elastic/backport-demo)', async () => {
    const branches = await getBranches(REMOTE_ORIGIN_REPO_PATH);
    expect(branches).toEqual(['6.0', '* master']);
  });

  it('should create branch in the fork (sqren/backport-demo)', async () => {
    const branches = await getBranches(REMOTE_FORK_REPO_PATH);
    expect(branches).toEqual([
      '6.0',
      'backport/6.0/pr-85_commit-2e63475c',
      '* master',
    ]);
  });

  it('should have cherry picked the correct commit', async () => {
    const commit = await getLatestCommit({
      branch: 'backport/6.0/pr-85_commit-2e63475c',
      commitCount: 2,
      cwd: REMOTE_FORK_REPO_PATH,
    });
    expect(commit).toMatchInlineSnapshot(`
            " romeo-and-juliet.txt | 2 +-
             1 file changed, 1 insertion(+), 1 deletion(-)

            diff --git a/romeo-and-juliet.txt b/romeo-and-juliet.txt
            index 51e1e4b..4814bb0 100644
            --- a/romeo-and-juliet.txt
            +++ b/romeo-and-juliet.txt
            @@ -203 +203 @@ But soft, behold! lo, where it comes again!
            -Re-enter Ghost
            +Re-enter 👻
             romeo-and-juliet.txt | 2 +-
             1 file changed, 1 insertion(+), 1 deletion(-)

            diff --git a/romeo-and-juliet.txt b/romeo-and-juliet.txt
            index 87f1ac7..51e1e4b 100644
            --- a/romeo-and-juliet.txt
            +++ b/romeo-and-juliet.txt
            @@ -158 +158 @@ Thereto prick'd on by a most emulate pride,
            -Dared to the combat; in which our valiant Hamlet--
            +Dared to the combat; in 🧙‍♀️ our valiant Hamlet--
            "
        `);
  });
});

describe('when disabling fork mode', () => {
  let spies: ReturnType<typeof createSpies>;

  beforeEach(
    once(async () => {
      jest.clearAllMocks();
      spies = createSpies({ commitCount: 1 });
      await deleteAndSetupEnvironment();

      const options = await getOptions(['--fork=false']);
      await runWithOptions(options);
    })
  );

  it('should create PR for non-forked branch', () => {
    const { createTargetPullRequestPayload } = spies.getSpyCalls();
    expect(createTargetPullRequestPayload.head).toBe(
      'elastic:backport/6.0/pr-85'
    );
  });

  it('should create new branches in origin (elastic/backport-demo)', async () => {
    const branches = await getBranches(REMOTE_ORIGIN_REPO_PATH);
    expect(branches).toEqual(['6.0', 'backport/6.0/pr-85', '* master']);
  });

  it('should NOT create branch in the fork (sqren/backport-demo)', async () => {
    const branches = await getBranches(REMOTE_FORK_REPO_PATH);
    expect(branches).toEqual(['6.0', '* master']);
  });

  it('should cherry pick the correct commit', async () => {
    const commit = await getLatestCommit({
      branch: 'backport/6.0/pr-85',
      commitCount: 1,
      cwd: REMOTE_ORIGIN_REPO_PATH,
    });
    expect(commit).toMatchInlineSnapshot(`
      " romeo-and-juliet.txt | 2 +-
       1 file changed, 1 insertion(+), 1 deletion(-)

      diff --git a/romeo-and-juliet.txt b/romeo-and-juliet.txt
      index 87f1ac7..51e1e4b 100644
      --- a/romeo-and-juliet.txt
      +++ b/romeo-and-juliet.txt
      @@ -158 +158 @@ Thereto prick'd on by a most emulate pride,
      -Dared to the combat; in which our valiant Hamlet--
      +Dared to the combat; in 🧙‍♀️ our valiant Hamlet--
      "
    `);
  });
});
