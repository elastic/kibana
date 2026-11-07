# Manual UI test: multi-tenant Kibana

A browser walkthrough. No scripts. Each step says what you should see.

You need the three clusters running and initialised, and multi-tenant Kibana running, as in [README.md](README.md) steps 1 to 3. Use Chrome or Edge. Both send `*.localhost` to your machine, so no `/etc/hosts` change is needed.

## 1. Send each tenant its header

Kibana only knows the tenant from the `x-elastic-project-id` header. Install a header extension such as [ModHeader](https://modheader.com/) and add one rule per hostname:

| Request URL contains | Header | Value |
| --- | --- | --- |
| `project-a.localhost` | `x-elastic-project-id` | `project-a` |
| `project-b.localhost` | `x-elastic-project-id` | `project-b` |
| `project-c.localhost` | `x-elastic-project-id` | `project-c` |

Check the extension is on. A request without the header goes to `project-a`, so a missing rule looks like a working login against the wrong cluster.

Open three tabs and leave them open for the whole walkthrough:

- `http://project-a.localhost:5601`
- `http://project-b.localhost:5601`
- `http://project-c.localhost:5601`

## 2. Log in to each tenant

Each cluster has its own `elastic` password. In each tab, log in as `elastic`:

| Tab | Password |
| --- | --- |
| project-a | `changeme-a` |
| project-b | `changeme-b` |
| project-c | `changeme-c` |

You should land in Kibana in all three tabs. The first tenant you log into may show **Select a solution view for your space**. Pick **Classic (legacy)** so the left navigation matches the steps below. The other tabs may skip that page. That skip is a known gap, noted at the end.

## 3. See which cluster answers

In each tab open **Dev Tools** (`/app/dev_tools#/console`) and run:

```
GET /
```

The `cluster_name` in the response should be `project-a`, `project-b`, and `project-c` in the matching tab. This is the same check as the console proxy, done from the UI.

## 4. Write something in one tenant

A fresh cluster has no indices, and Kibana will not save a data view until the pattern matches one. Skip **Add integration**. In the **project-b** tab only:

1. Open **Stack Management > Data Views** (`/app/management/kibana/dataViews`).
2. Click **Add sample data**, then **Add data** on **Sample web logs**.
3. Come back to Data Views. You should see `kibana_sample_data_logs`.
4. Open **Stack Management > Spaces** (`/app/management/kibana/spaces`) and create a space with id and name `mt-manual`.

In the **project-a** and **project-c** tabs, open the same two pages. Neither should list `kibana_sample_data_logs` or `mt-manual`. Refresh each page first so you are not looking at a stale tab.

## 5. Change one tenant's profile

In the **project-b** tab open **User settings** (the user menu at the top right, or `/security/account`). Set the avatar initials to `PB` and click **Save changes**. The avatar at the top right should show `PB`.

Look at the avatar in the project-a and project-c tabs. Both should still show `E`. Reload those tabs to be sure.

## 6. Stay logged in, then log one tenant out

Reload all three tabs. Each one should still be logged in, on its own hostname.

In the **project-b** tab, open the user menu and click **Log out**. You should see **You have logged out of Elastic.**

Reload the project-a and project-c tabs. Both should still be logged in.

**See the routing.** In the project-b tab, log in as `elastic` with `changeme-c`. You should get **Username or password is incorrect**, because that password only exists in cluster C. Then log in with `changeme-b`. That should work, and Dev Tools should still report `cluster_name: project-b`.

## 7. Clean up

In the project-b tab, open **Stack Management > Data Views**, find `kibana_sample_data_logs`, and delete it. Then open **Integrations > Sample data** (or Home > Add data > Sample data) and click **Remove** on **Sample web logs**. Delete the `mt-manual` space. Set the avatar initials back to `e` if you want a clean profile.

## What you will see that is not a session bug

- **Configuration recommended** toast about `server.publicBaseUrl`. Expected on a local dev server. Mute it.
- **Solution view picker.** After the first tenant picks a view, the other tenants are not asked, even though their space has no view. The choice itself is saved only in the tenant that made it.
- **Advanced settings.** Stack Management > Advanced Settings can show one tenant's value to another. The saved value is in the right cluster, but the read comes from a process-wide cache. Details are in [FINDINGS.md](FINDINGS.md).
- **One hostname for every tenant.** On plain `localhost:5601` the browser keeps a single session cookie, so logging into B logs you out of A. Use the three hostnames above. Separate browser profiles also work.
