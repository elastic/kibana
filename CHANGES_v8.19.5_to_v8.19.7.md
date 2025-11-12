# Changes Between Kibana v8.19.5 and v8.19.7

## Overview

This document lists all changes between Kibana version 8.19.5 and 8.19.7, including links to GitHub pull requests where applicable.

**Summary Statistics:**
- **Total Commits:** 261
- **Files Changed:** 1,652 files
- **Lines Added:** 26,071
- **Lines Removed:** 9,968
- **Contributors:** 72 unique contributors
- **Time Period:** Approximately 35 days (October 2024 - November 2024)

**View full diff on GitHub:**
[https://github.com/elastic/kibana/compare/v8.19.5...v8.19.7](https://github.com/elastic/kibana/compare/v8.19.5...v8.19.7)

---

## Detailed Commit List

- **[8.19][ci] Bump minimum diskSizeGB to 100 (#237513) (#237518)** - [#237513](https://github.com/elastic/kibana/pull/237513)
  - Commit: [`b4ff58254fe`](https://github.com/elastic/kibana/commit/b4ff58254fe)
  - Author: Jon
  - Date: 2025-10-03

- **[8.19] [Obs AI Assistant] Update tooltip behaviour to close on mouse out (#237202) (#237514)** - [#237202](https://github.com/elastic/kibana/pull/237202)
  - Commit: [`327b5dd732a`](https://github.com/elastic/kibana/commit/327b5dd732a)
  - Author: Viduni Wickramarachchi
  - Date: 2025-10-03

- **[8.19] [a11y] Prevent index polling from overriding pipeline settings while editing (#237509) (#237549)** - [#237509](https://github.com/elastic/kibana/pull/237509)
  - Commit: [`9374865470e`](https://github.com/elastic/kibana/commit/9374865470e)
  - Author: Kibana Machine
  - Date: 2025-10-04

- **[Docs] Add 8.19.5 release notes (#237395)** - [#237395](https://github.com/elastic/kibana/pull/237395)
  - Commit: [`f500af836a9`](https://github.com/elastic/kibana/commit/f500af836a9)
  - Author: wajihaparvez
  - Date: 2025-10-06

- **[8.19] [Docs] Add 8.18.8 release notes (#237396) (#237601)** - [#237396](https://github.com/elastic/kibana/pull/237396)
  - Commit: [`b84c4c0396d`](https://github.com/elastic/kibana/commit/b84c4c0396d)
  - Author: florent-leborgne
  - Date: 2025-10-06

- **[Docs] Security advisory for 8.18.8 and 8.19.5 in Kibana release notes (#237663)** - [#237663](https://github.com/elastic/kibana/pull/237663)
  - Commit: [`286b9fd557c`](https://github.com/elastic/kibana/commit/286b9fd557c)
  - Author: florent-leborgne
  - Date: 2025-10-06

- **[8.19] fix: update scout EuiComboBox single selection docs page selector (#237702) (#237739)** - [#237702](https://github.com/elastic/kibana/pull/237702)
  - Commit: [`e5b8bff270f`](https://github.com/elastic/kibana/commit/e5b8bff270f)
  - Author: Tiago Costa
  - Date: 2025-10-07

- **[8.19] [Ai Assistant] Update allow list to include default LLM settings (#237449) (#237624)** - [#237449](https://github.com/elastic/kibana/pull/237449)
  - Commit: [`fa3704cd511`](https://github.com/elastic/kibana/commit/fa3704cd511)
  - Author: Kenneth Kreindler
  - Date: 2025-10-07

- **[8.19] chore(tests,api keys): Update api keys flaky pagination tests (#236952) (#237779)** - [#236952](https://github.com/elastic/kibana/pull/236952)
  - Commit: [`19eea7107dd`](https://github.com/elastic/kibana/commit/19eea7107dd)
  - Author: Kibana Machine
  - Date: 2025-10-07

- **[8.19] Fix files management flyout crashing (#237588) (#237800)** - [#237588](https://github.com/elastic/kibana/pull/237588)
  - Commit: [`3cea635d414`](https://github.com/elastic/kibana/commit/3cea635d414)
  - Author: Kibana Machine
  - Date: 2025-10-07

- **[8.19] [ci] fix flaky-test-runner reporter for scout/synthetics (#236616) (#237664)** - [#236616](https://github.com/elastic/kibana/pull/236616)
  - Commit: [`ea7d36d0503`](https://github.com/elastic/kibana/commit/ea7d36d0503)
  - Author: Dzmitry Lemechko
  - Date: 2025-10-07

- **[8.19] [scout] update failed test reporter to support package (#235612) (#237655)** - [#235612](https://github.com/elastic/kibana/pull/235612)
  - Commit: [`18499296135`](https://github.com/elastic/kibana/commit/18499296135)
  - Author: Dzmitry Lemechko
  - Date: 2025-10-07

- **[a11y] Fetch connector immediately after conversion succeeds (#237652)** - [#237652](https://github.com/elastic/kibana/pull/237652)
  - Commit: [`4b6ad9594ae`](https://github.com/elastic/kibana/commit/4b6ad9594ae)
  - Author: Dennis Tismenko
  - Date: 2025-10-07

- **[8.19] [dashboards] fix panels in sections from URL state are not transformed (#237382) (#237512)** - [#237382](https://github.com/elastic/kibana/pull/237382)
  - Commit: [`c61c0eac7ec`](https://github.com/elastic/kibana/commit/c61c0eac7ec)
  - Author: Nathan Reese
  - Date: 2025-10-07

- **[8.19] Anchor tabbed modal using only CSS (#237431) (#237653)** - [#237431](https://github.com/elastic/kibana/pull/237431)
  - Commit: [`ea107e422e5`](https://github.com/elastic/kibana/commit/ea107e422e5)
  - Author: Eyo O. Eyo
  - Date: 2025-10-07

- **[8.19] [a11y] Add missing aria-label to button in content connectors (#237383) (#237884)** - [#237383](https://github.com/elastic/kibana/pull/237383)
  - Commit: [`f69766f7785`](https://github.com/elastic/kibana/commit/f69766f7785)
  - Author: Dennis Tismenko
  - Date: 2025-10-07

- **[8.19] Fix signals migration API bugs (#237552) (#237733)** - [#237552](https://github.com/elastic/kibana/pull/237552)
  - Commit: [`c7ab02bae40`](https://github.com/elastic/kibana/commit/c7ab02bae40)
  - Author: Kibana Machine
  - Date: 2025-10-07

- **[8.19] [Files] Remove histogram bar styles (#237874) (#237895)** - [#237874](https://github.com/elastic/kibana/pull/237874)
  - Commit: [`e1ef67dd65b`](https://github.com/elastic/kibana/commit/e1ef67dd65b)
  - Author: Kibana Machine
  - Date: 2025-10-07

- **chore(NA): bump version to 8.19.6 (#237694)** - [#237694](https://github.com/elastic/kibana/pull/237694)
  - Commit: [`c5e6133e476`](https://github.com/elastic/kibana/commit/c5e6133e476)
  - Author: Tiago Costa
  - Date: 2025-10-07

- **[8.19] [SecurirySolution] Fix risk score visu fails when entity name contains backslash (#237757) (#237935)** - [#237757](https://github.com/elastic/kibana/pull/237757)
  - Commit: [`d751ec889fe`](https://github.com/elastic/kibana/commit/d751ec889fe)
  - Author: Kibana Machine
  - Date: 2025-10-08

- **[8.19] [Console] Stricter checks for load_from query param (#237599) (#237956)** - [#237599](https://github.com/elastic/kibana/pull/237599)
  - Commit: [`bc175029368`](https://github.com/elastic/kibana/commit/bc175029368)
  - Author: Kibana Machine
  - Date: 2025-10-08

- **[8.19] [Upgrade Assistant] Fix privileges for reindexing indices (#237055) (#237340)** - [#237055](https://github.com/elastic/kibana/pull/237055)
  - Commit: [`31bd60f17d3`](https://github.com/elastic/kibana/commit/31bd60f17d3)
  - Author: Matthew Kime
  - Date: 2025-10-08

- **[8.19] Reduce unused URLs test flakiness (#237881) (#237959)** - [#237881](https://github.com/elastic/kibana/pull/237881)
  - Commit: [`a3a091b1eb3`](https://github.com/elastic/kibana/commit/a3a091b1eb3)
  - Author: Kibana Machine
  - Date: 2025-10-08

- **[8.19] Sync bundled packages with Package Storage (#237750)** - [#237750](https://github.com/elastic/kibana/pull/237750)
  - Commit: [`755e00c67ad`](https://github.com/elastic/kibana/commit/755e00c67ad)
  - Author: elastic-vault-github-plugin-prod[bot]
  - Date: 2025-10-08

- **[8.19] adding missing descriptions for tags (#237011) (#237946)** - [#237011](https://github.com/elastic/kibana/pull/237011)
  - Commit: [`8e812db37de`](https://github.com/elastic/kibana/commit/8e812db37de)
  - Author: Lisa Cawley
  - Date: 2025-10-08

- **[8.19] [a11y] Fix focus on generate API keys in connectors config (#237918) (#238064)** - [#237918](https://github.com/elastic/kibana/pull/237918)
  - Commit: [`395e2892dcf`](https://github.com/elastic/kibana/commit/395e2892dcf)
  - Author: Dennis Tismenko
  - Date: 2025-10-08

- **[8.19] Fix leaky Jest mock that causes the Scout Reporter to not some collect test events (#237837) (#238093)** - [#237837](https://github.com/elastic/kibana/pull/237837)
  - Commit: [`c667b9ca76d`](https://github.com/elastic/kibana/commit/c667b9ca76d)
  - Author: Kibana Machine
  - Date: 2025-10-08

- **[8.19] [Discover][ES**
  - Commit: [`d82ce065ff9`](https://github.com/elastic/kibana/commit/d82ce065ff9)
  - Author: QL mode] Clear time field sorting after going from Classic to ES
  - Date: QL mode (#235338) (#238108)|Miłosz Radzyński|2025-10-08

- **[8.19] [Spaces] Deleted obsolete test for session expiration toast (#237876) (#238131)** - [#237876](https://github.com/elastic/kibana/pull/237876)
  - Commit: [`2e8aa815abd`](https://github.com/elastic/kibana/commit/2e8aa815abd)
  - Author: Kibana Machine
  - Date: 2025-10-09

- **[8.19] [Security Solution] Send EBT when diagnostic query is empty (#238040) (#238079)** - [#238040](https://github.com/elastic/kibana/pull/238040)
  - Commit: [`6d5f3fc8c46`](https://github.com/elastic/kibana/commit/6d5f3fc8c46)
  - Author: Kibana Machine
  - Date: 2025-10-09

- **[8.19] [Synthetics] Disable max attempts for private locations sync task  (#237784) (#238185)** - [#237784](https://github.com/elastic/kibana/pull/237784)
  - Commit: [`b6f73b70bb5`](https://github.com/elastic/kibana/commit/b6f73b70bb5)
  - Author: Shahzad
  - Date: 2025-10-09

- **[8.19] [Fleet] Fix error when deleting orphaned integration policies (#237875) (#238077)** - [#237875](https://github.com/elastic/kibana/pull/237875)
  - Commit: [`b6d84b2414a`](https://github.com/elastic/kibana/commit/b6d84b2414a)
  - Author: Cristina Amico
  - Date: 2025-10-09

- **[8.19] [a11y] [Search] Make reorderable table component accessible (#237701) (#238155)** - [#237701](https://github.com/elastic/kibana/pull/237701)
  - Commit: [`c38dbd51d76`](https://github.com/elastic/kibana/commit/c38dbd51d76)
  - Author: Dennis Tismenko
  - Date: 2025-10-09

- **[8.19] [Security Solution] Add telemetry for bulk rule update (#237430) (#238198)** - [#237430](https://github.com/elastic/kibana/pull/237430)
  - Commit: [`0f5decdb737`](https://github.com/elastic/kibana/commit/0f5decdb737)
  - Author: Jacek Kolezynski
  - Date: 2025-10-09

- **[8.19] [Security Solution] Fix naming inconsistency for telemetry events (#238088) (#238233)** - [#238088](https://github.com/elastic/kibana/pull/238088)
  - Commit: [`0f1f889c3c6`](https://github.com/elastic/kibana/commit/0f1f889c3c6)
  - Author: Kibana Machine
  - Date: 2025-10-09

- **[8.19] [ResponseOps][Slack] Allow configuring and accessing only slack web api or webhook (#237640) (#238258)** - [#237640](https://github.com/elastic/kibana/pull/237640)
  - Commit: [`f9df42d68f3`](https://github.com/elastic/kibana/commit/f9df42d68f3)
  - Author: Janki Salvi
  - Date: 2025-10-09

- **[8.19] [CI] Prefer local moon cache (#238109) (#238310)** - [#238109](https://github.com/elastic/kibana/pull/238109)
  - Commit: [`4f1ca4beb74`](https://github.com/elastic/kibana/commit/4f1ca4beb74)
  - Author: Kibana Machine
  - Date: 2025-10-09

- **[8.19] [Security solution][Alerts] Fix alerts page controls (#236756) (#238287)** - [#236756](https://github.com/elastic/kibana/pull/236756)
  - Commit: [`df7717f4988`](https://github.com/elastic/kibana/commit/df7717f4988)
  - Author: Kibana Machine
  - Date: 2025-10-09

- **[8.19] [Security Solution] Improve versioning of EBT events (#238278) (#238331)** - [#238278](https://github.com/elastic/kibana/pull/238278)
  - Commit: [`ba58bd09d28`](https://github.com/elastic/kibana/commit/ba58bd09d28)
  - Author: Kibana Machine
  - Date: 2025-10-09

- **[8.19] [scout] add euiToastWrapper and update streams_app tests (#236559) (#238171)** - [#236559](https://github.com/elastic/kibana/pull/236559)
  - Commit: [`7c9c2bce62a`](https://github.com/elastic/kibana/commit/7c9c2bce62a)
  - Author: Dzmitry Lemechko
  - Date: 2025-10-10

- **[Security Solution][SDH]: detections endpoint does not successfully redirect on v8.19 (#238098)** - [#238098](https://github.com/elastic/kibana/pull/238098)
  - Commit: [`965f0edd118`](https://github.com/elastic/kibana/commit/965f0edd118)
  - Author: Agustina Nahir Ruidiaz
  - Date: 2025-10-10

- **[8.19] [Obs AI Assistant] Unskip API test: “Knowledge base: when upgrading from 8.10 to 8.18" (#238117) (#238375)** - [#238117](https://github.com/elastic/kibana/pull/238117)
  - Commit: [`b8fd527861b`](https://github.com/elastic/kibana/commit/b8fd527861b)
  - Author: Søren Louv-Jansen
  - Date: 2025-10-10

- **[8.19] `yarn kbn clean` should also clean `.moon/cache` (#237967) (#238191)** - [#237967](https://github.com/elastic/kibana/pull/237967)
  - Commit: [`c87476595aa`](https://github.com/elastic/kibana/commit/c87476595aa)
  - Author: Alex Szabo
  - Date: 2025-10-10

- **[8.19] Add tags for the query so the search is scoped within the test (#236706) (#238441)** - [#236706](https://github.com/elastic/kibana/pull/236706)
  - Commit: [`1bdee3be66e`](https://github.com/elastic/kibana/commit/1bdee3be66e)
  - Author: Kibana Machine
  - Date: 2025-10-10

- **[8.19] Extend fleet helper in Scout (#236757)** - [#236757](https://github.com/elastic/kibana/pull/236757)
  - Commit: [`de690807a85`](https://github.com/elastic/kibana/commit/de690807a85)
  - Author: Charis Kalpakis
  - Date: 2025-10-10

- **[8.19] [CI] Disable moon cache for build (#238404) (#238422)** - [#238404](https://github.com/elastic/kibana/pull/238404)
  - Commit: [`17173329c0d`](https://github.com/elastic/kibana/commit/17173329c0d)
  - Author: Kibana Machine
  - Date: 2025-10-10

- **[8.19] [SLO] take inspect links to filtered transform view (#237177) (#237888)** - [#237177](https://github.com/elastic/kibana/pull/237177)
  - Commit: [`d74f45d7228`](https://github.com/elastic/kibana/commit/d74f45d7228)
  - Author: Bailey Cash
  - Date: 2025-10-10

- **[8.19] [Obs AI Assistant] fix flaky test when uploading bulk entries (#237711) (#238564)** - [#237711](https://github.com/elastic/kibana/pull/237711)
  - Commit: [`4654a634973`](https://github.com/elastic/kibana/commit/4654a634973)
  - Author: Kibana Machine
  - Date: 2025-10-13

- **[8.19] [Obs AI Assistant] Add ebt telemetry  (#237499) (#238483)** - [#237499](https://github.com/elastic/kibana/pull/237499)
  - Commit: [`919ff40576f`](https://github.com/elastic/kibana/commit/919ff40576f)
  - Author: Sandra G
  - Date: 2025-10-13

- **[8.19] [Index Management] Fix @custom component template creation (#237952) (#238560)** - [#237952](https://github.com/elastic/kibana/pull/237952)
  - Commit: [`3813e760849`](https://github.com/elastic/kibana/commit/3813e760849)
  - Author: Karen Grigoryan
  - Date: 2025-10-13

- **[8.19] [Search][Accessibility] Show error text when fields are invalid (#238284) (#238506)** - [#238284](https://github.com/elastic/kibana/pull/238284)
  - Commit: [`bb1e96d6c47`](https://github.com/elastic/kibana/commit/bb1e96d6c47)
  - Author: Brittany
  - Date: 2025-10-13

- **[8.19] Normalize resulting paths to unix paths after glob usage (#236044) (#237102)** - [#236044](https://github.com/elastic/kibana/pull/236044)
  - Commit: [`e7d41e5b966`](https://github.com/elastic/kibana/commit/e7d41e5b966)
  - Author: Alex Szabo
  - Date: 2025-10-13

- **[8.19] Fix Host details page doesn't show 'show more' button for ip field (#238239) (#238580)** - [#238239](https://github.com/elastic/kibana/pull/238239)
  - Commit: [`f042217ca7b`](https://github.com/elastic/kibana/commit/f042217ca7b)
  - Author: Pablo Machado
  - Date: 2025-10-13

- **[8.19] [SLO] healthy transforms  should not appear in the health callout of unhealthy SLOs (#238216) (#238613)** - [#238216](https://github.com/elastic/kibana/pull/238216)
  - Commit: [`2f00f36ae04`](https://github.com/elastic/kibana/commit/2f00f36ae04)
  - Author: Panagiota Mitsopoulou
  - Date: 2025-10-13

- **[DOCS][8.19][ML UI/AI Infra] [Internal]: Documents the `aiAssistant:preferredAIAssistantType` setting (#238144)** - [#238144](https://github.com/elastic/kibana/pull/238144)
  - Commit: [`efc60c72a34`](https://github.com/elastic/kibana/commit/efc60c72a34)
  - Author: Nastasha Solomon
  - Date: 2025-10-13

- **[8.19] [Obs AI Assistant] add snapshot usage telemetry (#237542) (#238644)** - [#237542](https://github.com/elastic/kibana/pull/237542)
  - Commit: [`6db1ac484d4`](https://github.com/elastic/kibana/commit/6db1ac484d4)
  - Author: Sandra G
  - Date: 2025-10-13

- **[8.19] [ResponseOps][MaintenanceWindow] Update schedule duration API response to be same as request (#238389) (#238703)** - [#238389](https://github.com/elastic/kibana/pull/238389)
  - Commit: [`e8c4dc991a8`](https://github.com/elastic/kibana/commit/e8c4dc991a8)
  - Author: Kibana Machine
  - Date: 2025-10-13

- **[8.19] Update kibana-presentation misc canvas dependencies (main) (#235576) (#238712)** - [#235576](https://github.com/elastic/kibana/pull/235576)
  - Commit: [`a54c6b515a7`](https://github.com/elastic/kibana/commit/a54c6b515a7)
  - Author: Kibana Machine
  - Date: 2025-10-13

- **[8.19] [ci] Increase FTR timeout (#238734) (#238736)** - [#238734](https://github.com/elastic/kibana/pull/238734)
  - Commit: [`17d56e60d77`](https://github.com/elastic/kibana/commit/17d56e60d77)
  - Author: Kibana Machine
  - Date: 2025-10-14

- **Update dependency @moonrepo/cli to v1.40.2 (8.19) (#235147)** - [#235147](https://github.com/elastic/kibana/pull/235147)
  - Commit: [`57e36309d53`](https://github.com/elastic/kibana/commit/57e36309d53)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-14

- **[8.19] [scout] update eslint rules and adjust scout exports (#238275) (#238653)** - [#238275](https://github.com/elastic/kibana/pull/238275)
  - Commit: [`29e2c3b43c4`](https://github.com/elastic/kibana/commit/29e2c3b43c4)
  - Author: Dzmitry Lemechko
  - Date: 2025-10-14

- **[8.19] [Discover] Table Toolbar - add border to the selected docs button (#238508) (#238784)** - [#238508](https://github.com/elastic/kibana/pull/238508)
  - Commit: [`1614764143c`](https://github.com/elastic/kibana/commit/1614764143c)
  - Author: Kibana Machine
  - Date: 2025-10-14

- **[8.19] [Synthetics] Use runWithCache for fleet bulk operations !! (#238326) (#238797)** - [#238326](https://github.com/elastic/kibana/pull/238326)
  - Commit: [`9e85993ce1a`](https://github.com/elastic/kibana/commit/9e85993ce1a)
  - Author: Shahzad
  - Date: 2025-10-14

- **[8.19] [Security Solution] Assign auto-generated API clients to teams in CODEOWERS (#238285) (#238822)** - [#238285](https://github.com/elastic/kibana/pull/238285)
  - Commit: [`ac08bb9f95c`](https://github.com/elastic/kibana/commit/ac08bb9f95c)
  - Author: Nikita Indik
  - Date: 2025-10-14

- **[8.19] [CI] upgrade @moonrepo/cli to 1.41.2 (#237437) (#238484)** - [#237437](https://github.com/elastic/kibana/pull/237437)
  - Commit: [`e065c23c064`](https://github.com/elastic/kibana/commit/e065c23c064)
  - Author: Alex Szabo
  - Date: 2025-10-14

- **[8.19] [Security Solution] Improve versioning of EBT events - fix schema (#238383) (#238834)** - [#238383](https://github.com/elastic/kibana/pull/238383)
  - Commit: [`defce0108b4`](https://github.com/elastic/kibana/commit/defce0108b4)
  - Author: Kibana Machine
  - Date: 2025-10-14

- **[8.19] Update dependency launchdarkly-js-client-sdk to ^3.9.0 (main) (#235161) (#238857)** - [#235161](https://github.com/elastic/kibana/pull/235161)
  - Commit: [`e6add6ef869`](https://github.com/elastic/kibana/commit/e6add6ef869)
  - Author: Kibana Machine
  - Date: 2025-10-14

- **[8.19] [Cases] - Connector api update (#236863) (#238909)** - [#236863](https://github.com/elastic/kibana/pull/236863)
  - Commit: [`337049c361d`](https://github.com/elastic/kibana/commit/337049c361d)
  - Author: Kibana Machine
  - Date: 2025-10-14

- **[8.19] [ResponseOps] Update `nodemailer` (#238816) (#238919)** - [#238816](https://github.com/elastic/kibana/pull/238816)
  - Commit: [`e1f7600f01a`](https://github.com/elastic/kibana/commit/e1f7600f01a)
  - Author: Kibana Machine
  - Date: 2025-10-14

- **[8.19] [Custom threshold] [Alert details] Fix error when Observability AI Assistant is disabled (#238811) (#238966)** - [#238811](https://github.com/elastic/kibana/pull/238811)
  - Commit: [`f6a7b47c909`](https://github.com/elastic/kibana/commit/f6a7b47c909)
  - Author: Kibana Machine
  - Date: 2025-10-14

- **[8.19] [Security Solution] Fix flaky rules table Cypress tests (#237272) (#238970)** - [#237272](https://github.com/elastic/kibana/pull/237272)
  - Commit: [`5d085dccb20`](https://github.com/elastic/kibana/commit/5d085dccb20)
  - Author: Kibana Machine
  - Date: 2025-10-14

- **[8.19] [Search][a11y] show tooltip show more or fewer fields (#237913) (#238328)** - [#237913](https://github.com/elastic/kibana/pull/237913)
  - Commit: [`d1a36b2c3e5`](https://github.com/elastic/kibana/commit/d1a36b2c3e5)
  - Author: Saarika Bhasi
  - Date: 2025-10-14

- **[8.19] [dashboard] fix Adhoc dataviews from ES**
  - Commit: [`21a3e4f6eaf`](https://github.com/elastic/kibana/commit/21a3e4f6eaf)
  - Author: QL charts are being filtered out in the KQL search bar (#238731) (#238988)
  - Date: Kibana Machine|2025-10-14

- **[8.19] [Security Solution] [Elastic Defend] Add windows.advanced.events.security.event_disabled in endpoint advanced policy setting (#237770)** - [#237770](https://github.com/elastic/kibana/pull/237770)
  - Commit: [`21bbe498f3f`](https://github.com/elastic/kibana/commit/21bbe498f3f)
  - Author: Asuka Nakajima
  - Date: 2025-10-15

- **[8.19] [GenAi] Enable the Default LLM Setting feature flag by default <9.1 (#238986) (#239104)** - [#238986](https://github.com/elastic/kibana/pull/238986)
  - Commit: [`36cd9408da3`](https://github.com/elastic/kibana/commit/36cd9408da3)
  - Author: Kenneth Kreindler
  - Date: 2025-10-15

- **[8.19] [APM] Make `captureHeaders: false` default config (#239082) (#239118)** - [#239082](https://github.com/elastic/kibana/pull/239082)
  - Commit: [`45c28283266`](https://github.com/elastic/kibana/commit/45c28283266)
  - Author: Kibana Machine
  - Date: 2025-10-15

- **[8.19] [Controls] Fix initialization race condition (#237726) (#239013)** - [#237726](https://github.com/elastic/kibana/pull/237726)
  - Commit: [`7cb1470d08f`](https://github.com/elastic/kibana/commit/7cb1470d08f)
  - Author: Devon Thomson
  - Date: 2025-10-15

- **[8.19] [SLO] Indicate missing transforms in the health callout (#237769) (#239206)** - [#237769](https://github.com/elastic/kibana/pull/237769)
  - Commit: [`7edd660af00`](https://github.com/elastic/kibana/commit/7edd660af00)
  - Author: Kibana Machine
  - Date: 2025-10-15

- **[8.19] Support var removals on integration upgrade (#238542) (#239217)** - [#238542](https://github.com/elastic/kibana/pull/238542)
  - Commit: [`1fb7afd5e0a`](https://github.com/elastic/kibana/commit/1fb7afd5e0a)
  - Author: Michel Losier
  - Date: 2025-10-15

- **[8.19] [Visualize] Improve list error handling (#238355) (#239198)** - [#238355](https://github.com/elastic/kibana/pull/238355)
  - Commit: [`23959c2e39a`](https://github.com/elastic/kibana/commit/23959c2e39a)
  - Author: Nick Partridge
  - Date: 2025-10-15

- **Update dependency chromedriver to v141 (8.19) (#239054)** - [#239054](https://github.com/elastic/kibana/pull/239054)
  - Commit: [`797fe1feddf`](https://github.com/elastic/kibana/commit/797fe1feddf)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-15

- **[8.19] [Lens][Table] Fix filtering on tables with formula columns (#239222) (#239233)** - [#239222](https://github.com/elastic/kibana/pull/239222)
  - Commit: [`59a514df5df`](https://github.com/elastic/kibana/commit/59a514df5df)
  - Author: Kibana Machine
  - Date: 2025-10-16

- **[8.19] [Security Assistant] Prioritize connector defaultModel over stored conversation model (#237947) (#239237)** - [#237947](https://github.com/elastic/kibana/pull/237947)
  - Commit: [`e0fe81eb6bf`](https://github.com/elastic/kibana/commit/e0fe81eb6bf)
  - Author: Kibana Machine
  - Date: 2025-10-16

- **Update docker.elastic.co/wolfi/chainguard-base:latest Docker digest to ec17277 (8.19) (#234243)** - [#234243](https://github.com/elastic/kibana/pull/234243)
  - Commit: [`bb567727d1d`](https://github.com/elastic/kibana/commit/bb567727d1d)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-15

- **Update docker.elastic.co/wolfi/chainguard-base-fips:latest Docker digest to 2229af4 (8.19) (#237059)** - [#237059](https://github.com/elastic/kibana/pull/237059)
  - Commit: [`06b41314c81`](https://github.com/elastic/kibana/commit/06b41314c81)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-15

- **Update ftr (8.19) (#238771)** - [#238771](https://github.com/elastic/kibana/pull/238771)
  - Commit: [`7e688a1e9d7`](https://github.com/elastic/kibana/commit/7e688a1e9d7)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-15

- **Update dependency @moonrepo/cli to v1.41.5 (8.19) (#238758)** - [#238758](https://github.com/elastic/kibana/pull/238758)
  - Commit: [`857a96550fa`](https://github.com/elastic/kibana/commit/857a96550fa)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-16

- **Update docker.elastic.co/wolfi/chainguard-base:latest Docker digest to eb38cad (8.19) (#239254)** - [#239254](https://github.com/elastic/kibana/pull/239254)
  - Commit: [`f94ad5d820d`](https://github.com/elastic/kibana/commit/f94ad5d820d)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-16

- **Update docker.elastic.co/wolfi/chainguard-base-fips:latest Docker digest to 334c255 (8.19) (#239257)** - [#239257](https://github.com/elastic/kibana/pull/239257)
  - Commit: [`b8a5455b17e`](https://github.com/elastic/kibana/commit/b8a5455b17e)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-16

- **[8.19] [ci] ingest scout test events for internal config (#236263) (#238956)** - [#236263](https://github.com/elastic/kibana/pull/236263)
  - Commit: [`3717903059a`](https://github.com/elastic/kibana/commit/3717903059a)
  - Author: Dzmitry Lemechko
  - Date: 2025-10-16

- **[8.19] [Scout] Capture test run target, mode and parallel info (#229846) (#239270)** - [#229846](https://github.com/elastic/kibana/pull/229846)
  - Commit: [`3ae07a14912`](https://github.com/elastic/kibana/commit/3ae07a14912)
  - Author: Dzmitry Lemechko
  - Date: 2025-10-16

- **[8.19] chore: bump kube-stack Helm chart onboarding to 0.10.5 (#237227) (#238950)** - [#237227](https://github.com/elastic/kibana/pull/237227)
  - Commit: [`74a28760432`](https://github.com/elastic/kibana/commit/74a28760432)
  - Author: Roger Coll
  - Date: 2025-10-16

- **[8.19] [Lens] Fix metric color assignment when breakdown and a max dimension are defined (#238901) (#239294)** - [#238901](https://github.com/elastic/kibana/pull/238901)
  - Commit: [`b4cfc37f634`](https://github.com/elastic/kibana/commit/b4cfc37f634)
  - Author: Kibana Machine
  - Date: 2025-10-16

- **[8.19] Removing Interceptor Test FIles (#237915) (#239327)** - [#237915](https://github.com/elastic/kibana/pull/237915)
  - Commit: [`64c2e8a0b0d`](https://github.com/elastic/kibana/commit/64c2e8a0b0d)
  - Author: Kibana Machine
  - Date: 2025-10-16

- **[8.19] [FTR] Stagger SAML Login requests to address flakiness  (#238494) (#238962)** - [#238494](https://github.com/elastic/kibana/pull/238494)
  - Commit: [`b3bff01a095`](https://github.com/elastic/kibana/commit/b3bff01a095)
  - Author: Kibana Machine
  - Date: 2025-10-16

- **[8.19] [Discover][Advanced Settings] Fix missing fields when using combined filters with `ignoreFilterIfFieldNotInIndex` UI setting (#238945) (#239282)** - [#238945](https://github.com/elastic/kibana/pull/238945)
  - Commit: [`66922f64898`](https://github.com/elastic/kibana/commit/66922f64898)
  - Author: Miłosz Radzyński
  - Date: 2025-10-16

- **skip failing test suite (#239356)** - [#239356](https://github.com/elastic/kibana/pull/239356)
  - Commit: [`2efbd378bc2`](https://github.com/elastic/kibana/commit/2efbd378bc2)
  - Author: Kibana Machine
  - Date: 2025-10-16

- **[8.19] Update dependency backport to ^10.1.0 (main) (#237152) (#239269)** - [#237152](https://github.com/elastic/kibana/pull/237152)
  - Commit: [`09e56f0ef79`](https://github.com/elastic/kibana/commit/09e56f0ef79)
  - Author: Brad White
  - Date: 2025-10-16

- **[8.19] [Roles] Added error reasons for role malformed message (#239098) (#239410)** - [#239098](https://github.com/elastic/kibana/pull/239098)
  - Commit: [`09ef17e784b`](https://github.com/elastic/kibana/commit/09ef17e784b)
  - Author: Kibana Machine
  - Date: 2025-10-16

- **[8.19] [Synthetics] Fix recover alert while monitor is down (#237479) (#239414)** - [#237479](https://github.com/elastic/kibana/pull/237479)
  - Commit: [`8c88aa8abbd`](https://github.com/elastic/kibana/commit/8c88aa8abbd)
  - Author: Kibana Machine
  - Date: 2025-10-16

- **[8.19] Improvements to advanced setting reset to default value (#239252) (#239322)** - [#239252](https://github.com/elastic/kibana/pull/239252)
  - Commit: [`7221629de23`](https://github.com/elastic/kibana/commit/7221629de23)
  - Author: Kibana Machine
  - Date: 2025-10-16

- **[8.19] [APM] removing unecessary _source from query as we use fields (#239205) (#239342)** - [#239205](https://github.com/elastic/kibana/pull/239205)
  - Commit: [`1f7c1888048`](https://github.com/elastic/kibana/commit/1f7c1888048)
  - Author: Cauê Marcondes
  - Date: 2025-10-16

- **[8.19] Upgrade Puppeteer to 24.24.0  (#238569) (#239445)** - [#238569](https://github.com/elastic/kibana/pull/238569)
  - Commit: [`5107a93b4c0`](https://github.com/elastic/kibana/commit/5107a93b4c0)
  - Author: Patrick Mueller
  - Date: 2025-10-16

- **Update dependency selenium-webdriver to ^4.36.0 (8.19) (#239444)** - [#239444](https://github.com/elastic/kibana/pull/239444)
  - Commit: [`db7a2465302`](https://github.com/elastic/kibana/commit/db7a2465302)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-16

- **[8.19] [scout] fix failed pw configs retry (#232971) (#239265)** - [#232971](https://github.com/elastic/kibana/pull/232971)
  - Commit: [`c2d577e2b6c`](https://github.com/elastic/kibana/commit/c2d577e2b6c)
  - Author: Dzmitry Lemechko
  - Date: 2025-10-17

- **[8.19] fix: simulate template preview perf issue (#238974) (#239477)** - [#238974](https://github.com/elastic/kibana/pull/238974)
  - Commit: [`7e338d52831`](https://github.com/elastic/kibana/commit/7e338d52831)
  - Author: Kibana Machine
  - Date: 2025-10-17

- **[8.19] [ES**
  - Commit: [`48c9733cb5b`](https://github.com/elastic/kibana/commit/48c9733cb5b)
  - Author: QL] Fix computation of newFields in summarizeCommand function (#239335) (#239474)
  - Date: Kibana Machine|2025-10-17

- **[8.19] [Infra][Hosts] Fixes the missing host filter button (#238939) (#239510)** - [#238939](https://github.com/elastic/kibana/pull/238939)
  - Commit: [`5000e0a8067`](https://github.com/elastic/kibana/commit/5000e0a8067)
  - Author: Kibana Machine
  - Date: 2025-10-17

- **[8.19] Update dependency @openfeature/core to ^1.9.1 (main) (#238606) (#238650)** - [#238606](https://github.com/elastic/kibana/pull/238606)
  - Commit: [`16d711ba940`](https://github.com/elastic/kibana/commit/16d711ba940)
  - Author: Kibana Machine
  - Date: 2025-10-17

- **[8.19] [BUG][OBS-UX-MGMT] Rule condition chart parser replaces metric names inside filter values (e.g., A in "Accounts") (#238849) (#239359)** - [#238849](https://github.com/elastic/kibana/pull/238849)
  - Commit: [`ca492728e44`](https://github.com/elastic/kibana/commit/ca492728e44)
  - Author: Kibana Machine
  - Date: 2025-10-17

- **[8.19] remove versions, to avoid proto installing tools (#239519) (#239540)** - [#239519](https://github.com/elastic/kibana/pull/239519)
  - Commit: [`5f64c5aa685`](https://github.com/elastic/kibana/commit/5f64c5aa685)
  - Author: Kibana Machine
  - Date: 2025-10-17

- **[8.19] fix broken solution avatar story (#239496) (#239535)** - [#239496](https://github.com/elastic/kibana/pull/239496)
  - Commit: [`806fc0237c3`](https://github.com/elastic/kibana/commit/806fc0237c3)
  - Author: Eyo O. Eyo
  - Date: 2025-10-17

- **[8.19] Update dependency @openfeature/launchdarkly-client-provider to ^0.3.3 (main) (#238862) (#239321)** - [#238862](https://github.com/elastic/kibana/pull/238862)
  - Commit: [`dae0d55a32e`](https://github.com/elastic/kibana/commit/dae0d55a32e)
  - Author: Jean-Louis Leysens
  - Date: 2025-10-17

- **[8.19] [cypress] Fix APM Cypress report paths (#239111) (#239128)** - [#239111](https://github.com/elastic/kibana/pull/239111)
  - Commit: [`d764db04c40`](https://github.com/elastic/kibana/commit/d764db04c40)
  - Author: Kibana Machine
  - Date: 2025-10-17

- **[8.19] [Security Solution] Support field encryption in queries (#238307) (#239592)** - [#238307](https://github.com/elastic/kibana/pull/238307)
  - Commit: [`4f902aa92ad`](https://github.com/elastic/kibana/commit/4f902aa92ad)
  - Author: Kibana Machine
  - Date: 2025-10-17

- **Update docker.elastic.co/wolfi/chainguard-base-fips:latest Docker digest to cbdc968 (8.19) (#239460)** - [#239460](https://github.com/elastic/kibana/pull/239460)
  - Commit: [`31502767494`](https://github.com/elastic/kibana/commit/31502767494)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-17

- **Update docker.elastic.co/wolfi/chainguard-base:latest Docker digest to b85d54c (8.19) (#239461)** - [#239461](https://github.com/elastic/kibana/pull/239461)
  - Commit: [`9e3476c1f55`](https://github.com/elastic/kibana/commit/9e3476c1f55)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-17

- **[8.19] [Synthetics] Fix broken colors for status panels !! (#211422) (#239595)** - [#211422](https://github.com/elastic/kibana/pull/211422)
  - Commit: [`2d70b5d36c7`](https://github.com/elastic/kibana/commit/2d70b5d36c7)
  - Author: Francesco Fagnani
  - Date: 2025-10-20

- **[8.19] [CI] skip audit on .buildkite dep installation (#239699) (#239703)** - [#239699](https://github.com/elastic/kibana/pull/239699)
  - Commit: [`1e22e2f209b`](https://github.com/elastic/kibana/commit/1e22e2f209b)
  - Author: Kibana Machine
  - Date: 2025-10-20

- **[8.19] [APM] Add GC stats chart to Python runtime metrics dashboards (#238212) (#239618)** - [#238212](https://github.com/elastic/kibana/pull/238212)
  - Commit: [`ee21ba16f73`](https://github.com/elastic/kibana/commit/ee21ba16f73)
  - Author: Kibana Machine
  - Date: 2025-10-20

- **[8.19] [Controls] Fix error when selecting "(blank)" value in options list (#239791) (#239812)** - [#239791](https://github.com/elastic/kibana/pull/239791)
  - Commit: [`6f82a4e64ee`](https://github.com/elastic/kibana/commit/6f82a4e64ee)
  - Author: Kibana Machine
  - Date: 2025-10-20

- **[8.19] Update dependency postcss to ^8.5.6 (main) (#235642) (#236852)** - [#235642](https://github.com/elastic/kibana/pull/235642)
  - Commit: [`8b5ac1b1538`](https://github.com/elastic/kibana/commit/8b5ac1b1538)
  - Author: Brad White
  - Date: 2025-10-21

- **[8.19] [Discover] Address flaky reporting tests (#238617) (#239499)** - [#238617](https://github.com/elastic/kibana/pull/238617)
  - Commit: [`f8ab4ff8c44`](https://github.com/elastic/kibana/commit/f8ab4ff8c44)
  - Author: Julia Rechkunova
  - Date: 2025-10-21

- **[8.19] [CI] Optionally pass along BUILDKITE_PULL_REQUEST* variables to triggered pipelines (#239465) (#239853)** - [#239465](https://github.com/elastic/kibana/pull/239465)
  - Commit: [`e82ae678c8f`](https://github.com/elastic/kibana/commit/e82ae678c8f)
  - Author: Kibana Machine
  - Date: 2025-10-21

- **[8.19] [EDR Workflows] Fix wrongly enabled 'Add Endpoint exceptions' button (#239582) (#239828)** - [#239582](https://github.com/elastic/kibana/pull/239582)
  - Commit: [`d467ff33395`](https://github.com/elastic/kibana/commit/d467ff33395)
  - Author: Kibana Machine
  - Date: 2025-10-21

- **[8.19] [Search profiler] Unskip searchprofiler stateful tests (#239364) (#239873)** - [#239364](https://github.com/elastic/kibana/pull/239364)
  - Commit: [`fa731213ffa`](https://github.com/elastic/kibana/commit/fa731213ffa)
  - Author: Kibana Machine
  - Date: 2025-10-21

- **[8.19] Update dependency lmdb to ^3.4.3 (main) (#239680) (#239889)** - [#239680](https://github.com/elastic/kibana/pull/239680)
  - Commit: [`3c6125b2e4e`](https://github.com/elastic/kibana/commit/3c6125b2e4e)
  - Author: Kibana Machine
  - Date: 2025-10-21

- **[8.19] [Lens][ConfigBuilder] Fix internal reference handling (#239431) (#239799)** - [#239431](https://github.com/elastic/kibana/pull/239431)
  - Commit: [`56ccab8f24b`](https://github.com/elastic/kibana/commit/56ccab8f24b)
  - Author: Nick Partridge
  - Date: 2025-10-21

- **[8.19] Remove skipped user API tests that are no longer accurate (#239786) (#239843)** - [#239786](https://github.com/elastic/kibana/pull/239786)
  - Commit: [`42d22fe32b8`](https://github.com/elastic/kibana/commit/42d22fe32b8)
  - Author: Kibana Machine
  - Date: 2025-10-21

- **[DOCS][ResponseOps][Reporting][8.19] Add documentation about required privileges with API key authentication (#234255)** - [#234255](https://github.com/elastic/kibana/pull/234255)
  - Commit: [`93caa41bf1d`](https://github.com/elastic/kibana/commit/93caa41bf1d)
  - Author: Nastasha Solomon
  - Date: 2025-10-21

- **Update storybook (8.19) (#239306)** - [#239306](https://github.com/elastic/kibana/pull/239306)
  - Commit: [`b56dd1fac5c`](https://github.com/elastic/kibana/commit/b56dd1fac5c)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-21

- **[8.19] Update cssnano (main) (#228898) (#239862)** - [#228898](https://github.com/elastic/kibana/pull/228898)
  - Commit: [`7a16cb3f0a4`](https://github.com/elastic/kibana/commit/7a16cb3f0a4)
  - Author: Brad White
  - Date: 2025-10-21

- **[8.19] Update dependency postcss-loader to ^8.2.0 (main) (#235715) (#239866)** - [#235715](https://github.com/elastic/kibana/pull/235715)
  - Commit: [`1395ec60723`](https://github.com/elastic/kibana/commit/1395ec60723)
  - Author: Brad White
  - Date: 2025-10-21

- **[8.19] Update polyfills (main) (#235539) (#239639)** - [#235539](https://github.com/elastic/kibana/pull/235539)
  - Commit: [`896f75acd9f`](https://github.com/elastic/kibana/commit/896f75acd9f)
  - Author: Brad White
  - Date: 2025-10-21

- **[8.19] Update dependency cssstyle to ^5.3.0 (main) (#236671) (#239864)** - [#236671](https://github.com/elastic/kibana/pull/236671)
  - Commit: [`ad901597d02`](https://github.com/elastic/kibana/commit/ad901597d02)
  - Author: Brad White
  - Date: 2025-10-21

- **[8.19] Update dependency @types/license-checker to v25 (main) (#235656) (#239997)** - [#235656](https://github.com/elastic/kibana/pull/235656)
  - Commit: [`0676994d7a8`](https://github.com/elastic/kibana/commit/0676994d7a8)
  - Author: Brad White
  - Date: 2025-10-21

- **[8.19] Update dependency @octokit/rest to v22 (main) (#235655) (#239996)** - [#235655](https://github.com/elastic/kibana/pull/235655)
  - Commit: [`d6f8c2dc73f`](https://github.com/elastic/kibana/commit/d6f8c2dc73f)
  - Author: Brad White
  - Date: 2025-10-21

- **[8.19] [Security Solution] Unskip Related Integrations Cypress test (#239532) (#239926)** - [#239532](https://github.com/elastic/kibana/pull/239532)
  - Commit: [`00b718ef6fb`](https://github.com/elastic/kibana/commit/00b718ef6fb)
  - Author: Nikita Indik
  - Date: 2025-10-22

- **[8.19] [Security Solution] Add FTR tests for prebuilt rules OOM testing (#236891) (#240013)** - [#236891](https://github.com/elastic/kibana/pull/236891)
  - Commit: [`8be088b55bb`](https://github.com/elastic/kibana/commit/8be088b55bb)
  - Author: Maxim Palenov
  - Date: 2025-10-22

- **[8.19] [Vega] add object normalization (#238503) (#240015)** - [#238503](https://github.com/elastic/kibana/pull/238503)
  - Commit: [`7fc9504009a`](https://github.com/elastic/kibana/commit/7fc9504009a)
  - Author: Kibana Machine
  - Date: 2025-10-22

- **[8.19] [Security Solution] Make prebuilt rules bootstrap errors visible (#239521) (#240044)** - [#239521](https://github.com/elastic/kibana/pull/239521)
  - Commit: [`34df3cd9ed6`](https://github.com/elastic/kibana/commit/34df3cd9ed6)
  - Author: Kibana Machine
  - Date: 2025-10-22

- **[8.19] Sync bundled packages with Package Storage (#239137)** - [#239137](https://github.com/elastic/kibana/pull/239137)
  - Commit: [`ca747b300b8`](https://github.com/elastic/kibana/commit/ca747b300b8)
  - Author: elastic-vault-github-plugin-prod[bot]
  - Date: 2025-10-22

- **[8.19] [Security Solution][Timelines] Fix template id asssignment (#237992) (#240031)** - [#237992](https://github.com/elastic/kibana/pull/237992)
  - Commit: [`c35017993a1`](https://github.com/elastic/kibana/commit/c35017993a1)
  - Author: lgestc
  - Date: 2025-10-22

- **[8.19] [Cloud Security] CDR Data View versioning and migration logic (#238547) (#239986)** - [#238547](https://github.com/elastic/kibana/pull/238547)
  - Commit: [`071e4fad056`](https://github.com/elastic/kibana/commit/071e4fad056)
  - Author: Paulo Silva
  - Date: 2025-10-22

- **[8.19] [Ingest Pipelines] Fix filter button focus behavior in pipelines table (#239692) (#240027)** - [#239692](https://github.com/elastic/kibana/pull/239692)
  - Commit: [`9ac180a1ae3`](https://github.com/elastic/kibana/commit/9ac180a1ae3)
  - Author: Damian Polewski
  - Date: 2025-10-22

- **[8.19] [NaturalLanguage2ESQL] Fix tool calling unavailable tools (#237174) (#239601)** - [#237174](https://github.com/elastic/kibana/pull/237174)
  - Commit: [`cd30c6f5d0b`](https://github.com/elastic/kibana/commit/cd30c6f5d0b)
  - Author: Quynh Nguyen (Quinn)
  - Date: 2025-10-22

- **[DOCS][8.19.x][Release notes]: Turning flapping off prevents alerts to be generated when alert delay is set to more than 1  (#240179)** - [#240179](https://github.com/elastic/kibana/pull/240179)
  - Commit: [`091d5fd8d3b`](https://github.com/elastic/kibana/commit/091d5fd8d3b)
  - Author: Nastasha Solomon
  - Date: 2025-10-22

- **[DOCS] 8.19.6 Kibana release notes (#240140)** - [#240140](https://github.com/elastic/kibana/pull/240140)
  - Commit: [`272e341b49b`](https://github.com/elastic/kibana/commit/272e341b49b)
  - Author: Nastasha Solomon
  - Date: 2025-10-22

- **Update dependency chromedriver to ^141.0.1 (8.19) (#240174)** - [#240174](https://github.com/elastic/kibana/pull/240174)
  - Commit: [`6d4eaff3584`](https://github.com/elastic/kibana/commit/6d4eaff3584)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-22

- **[8.19] Sync bundled packages with Package Storage (#240099)** - [#240099](https://github.com/elastic/kibana/pull/240099)
  - Commit: [`2db5407f396`](https://github.com/elastic/kibana/commit/2db5407f396)
  - Author: elastic-vault-github-plugin-prod[bot]
  - Date: 2025-10-23

- **[8.19] Allow for a 5ms error margin (#239917) (#240210)** - [#239917](https://github.com/elastic/kibana/pull/239917)
  - Commit: [`60baed286f4`](https://github.com/elastic/kibana/commit/60baed286f4)
  - Author: Kibana Machine
  - Date: 2025-10-23

- **[8.19] [Security Solution] Remove D&R helpers duplicates (#235972) (#240073)** - [#235972](https://github.com/elastic/kibana/pull/235972)
  - Commit: [`a52b1f96784`](https://github.com/elastic/kibana/commit/a52b1f96784)
  - Author: Nikita Indik
  - Date: 2025-10-23

- **[8.19] Make the test more flexible to entries that might have been rolled over (#240072) (#240238)** - [#240072](https://github.com/elastic/kibana/pull/240072)
  - Commit: [`19ff7a8758b`](https://github.com/elastic/kibana/commit/19ff7a8758b)
  - Author: Kibana Machine
  - Date: 2025-10-23

- **[8.19] [scout] embed css directly in html report (#240139) (#240247)** - [#240139](https://github.com/elastic/kibana/pull/240139)
  - Commit: [`89301e3c939`](https://github.com/elastic/kibana/commit/89301e3c939)
  - Author: Kibana Machine
  - Date: 2025-10-23

- **[8.19] Fix flaky rendering tests (#239789) (#240296)** - [#239789](https://github.com/elastic/kibana/pull/239789)
  - Commit: [`881bc361feb`](https://github.com/elastic/kibana/commit/881bc361feb)
  - Author: Larry Gregory
  - Date: 2025-10-23

- **[8.19] [Case] Improve all cases table loading to prevent flashing (#240155) (#240302)** - [#240155](https://github.com/elastic/kibana/pull/240155)
  - Commit: [`d0e353f28d7`](https://github.com/elastic/kibana/commit/d0e353f28d7)
  - Author: Kibana Machine
  - Date: 2025-10-23

- **[8.19] [dashboard] fix unable to reset unsaved change when enabling timeRestore and setting time range (#239992) (#240144)** - [#239992](https://github.com/elastic/kibana/pull/239992)
  - Commit: [`2fed52c85a2`](https://github.com/elastic/kibana/commit/2fed52c85a2)
  - Author: Nathan Reese
  - Date: 2025-10-23

- **[8.19] [Discover][Unified Traces] Improve Unified Traces API call latencies (#240285) (#240332)** - [#240285](https://github.com/elastic/kibana/pull/240285)
  - Commit: [`c86256b6027`](https://github.com/elastic/kibana/commit/c86256b6027)
  - Author: Gonçalo Rica Pais da Silva
  - Date: 2025-10-23

- **[8.19] [Fleet] Fix error formatting for logger (#240316) (#240364)** - [#240316](https://github.com/elastic/kibana/pull/240316)
  - Commit: [`ddc9d53921a`](https://github.com/elastic/kibana/commit/ddc9d53921a)
  - Author: Kibana Machine
  - Date: 2025-10-24

- **Update docker.elastic.co/wolfi/chainguard-base-fips:latest Docker digest to 3f7c6fa (8.19) (#240235)** - [#240235](https://github.com/elastic/kibana/pull/240235)
  - Commit: [`f20c09009e4`](https://github.com/elastic/kibana/commit/f20c09009e4)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-24

- **[8.19] `@kbn/storage-adapter`: do not update settings when updating mappings (#232840) (#240195)** - [#232840](https://github.com/elastic/kibana/pull/232840)
  - Commit: [`f1cda267731`](https://github.com/elastic/kibana/commit/f1cda267731)
  - Author: Jean-Louis Leysens
  - Date: 2025-10-24

- **Update docker.elastic.co/wolfi/chainguard-base:latest Docker digest to 792313d (8.19) (#240236)** - [#240236](https://github.com/elastic/kibana/pull/240236)
  - Commit: [`8653b2a00b6`](https://github.com/elastic/kibana/commit/8653b2a00b6)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-24

- **[8.19] [Index Management] Don't default index mode to standard and add set index mode toggle in template form (#238883) (#240282)** - [#238883](https://github.com/elastic/kibana/pull/238883)
  - Commit: [`98c80649909`](https://github.com/elastic/kibana/commit/98c80649909)
  - Author: Damian Polewski
  - Date: 2025-10-24

- **[8.19] [Copilot Web Agent] Improve copilot web agent instructions accuracy (#238562) (#240437)** - [#238562](https://github.com/elastic/kibana/pull/238562)
  - Commit: [`445057612b3`](https://github.com/elastic/kibana/commit/445057612b3)
  - Author: Karen Grigoryan
  - Date: 2025-10-24

- **[8.19] Fix URL in Disk Usage alerting rule (#240279) (#240476)** - [#240279](https://github.com/elastic/kibana/pull/240279)
  - Commit: [`d0298a702de`](https://github.com/elastic/kibana/commit/d0298a702de)
  - Author: Kibana Machine
  - Date: 2025-10-24

- **chore(NA): bump version to 8.19.7 (#240373)** - [#240373](https://github.com/elastic/kibana/pull/240373)
  - Commit: [`02a469b3b25`](https://github.com/elastic/kibana/commit/02a469b3b25)
  - Author: Tiago Costa
  - Date: 2025-10-24

- **[8.19] [APM] Fix the integration test issue with the APM package (#240352) (#240447)** - [#240352](https://github.com/elastic/kibana/pull/240352)
  - Commit: [`e60d9d1d9aa`](https://github.com/elastic/kibana/commit/e60d9d1d9aa)
  - Author: Kibana Machine
  - Date: 2025-10-24

- **[8.19] Show Transform Errors Across All SLO Table Pages (#237731) (#240158)** - [#237731](https://github.com/elastic/kibana/pull/237731)
  - Commit: [`93ae2950816`](https://github.com/elastic/kibana/commit/93ae2950816)
  - Author: Bailey Cash
  - Date: 2025-10-24

- **[8.19] Fixes Failing test: X-Pack Alerting API Integration Tests.x-pack/platform/test/alerting_api_integration/security_and_spaces/group1/tests/alerting/backfill/api_key·ts - alerting api integration security and spaces enabled Alerts - Group 1 alerts backfill rule runs backfill api key invalidation should wait to invalidate API key until backfill for rule is complete (#240339) (#240510)** - [#240339](https://github.com/elastic/kibana/pull/240339)
  - Commit: [`83db285fdf7`](https://github.com/elastic/kibana/commit/83db285fdf7)
  - Author: Kibana Machine
  - Date: 2025-10-24

- **[8.19] Allow fleet-setup retries for all environments (#240342) (#240515)** - [#240342](https://github.com/elastic/kibana/pull/240342)
  - Commit: [`6f32d1ecf66`](https://github.com/elastic/kibana/commit/6f32d1ecf66)
  - Author: Michel Losier
  - Date: 2025-10-24

- **[8.19] [ML]Inference endpoints UI: Ensure list loads when provider is custom (#240189) (#240540)** - [#240189](https://github.com/elastic/kibana/pull/240189)
  - Commit: [`408861f9940`](https://github.com/elastic/kibana/commit/408861f9940)
  - Author: Kibana Machine
  - Date: 2025-10-25

- **Update dependency chromedriver to ^141.0.2 (8.19) (#240500)** - [#240500](https://github.com/elastic/kibana/pull/240500)
  - Commit: [`c41b2b59676`](https://github.com/elastic/kibana/commit/c41b2b59676)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-24

- **Update docker.elastic.co/wolfi/chainguard-base-fips:latest Docker digest to 5445ab8 (8.19) (#240498)** - [#240498](https://github.com/elastic/kibana/pull/240498)
  - Commit: [`88969f27287`](https://github.com/elastic/kibana/commit/88969f27287)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-10-24

- **[8.19] [Fleet] Remove agent policies revision bump after updating settings (#239977) (#240468)** - [#239977](https://github.com/elastic/kibana/pull/239977)
  - Commit: [`831b8957585`](https://github.com/elastic/kibana/commit/831b8957585)
  - Author: Nicolas Chaulet
  - Date: 2025-10-27

- **[8.19] Sync bundled packages with Package Storage (#240325)** - [#240325](https://github.com/elastic/kibana/pull/240325)
  - Commit: [`2e9a83160ac`](https://github.com/elastic/kibana/commit/2e9a83160ac)
  - Author: elastic-vault-github-plugin-prod[bot]
  - Date: 2025-10-27

- **[8.19] [Security Solution] Wait for Fleet setup completion in OOM tests (#239900) (#240287)** - [#239900](https://github.com/elastic/kibana/pull/239900)
  - Commit: [`74f39864021`](https://github.com/elastic/kibana/commit/74f39864021)
  - Author: Kibana Machine
  - Date: 2025-10-27

- **[8.19] [Rollups] Add documentation for testing deprecated UI (#240331) (#240838)** - [#240331](https://github.com/elastic/kibana/pull/240331)
  - Commit: [`8d07de753c0`](https://github.com/elastic/kibana/commit/8d07de753c0)
  - Author: Kibana Machine
  - Date: 2025-10-27

- **[8.19] review of action response codes (#240420) (#240821)** - [#240420](https://github.com/elastic/kibana/pull/240420)
  - Commit: [`8f64d83377b`](https://github.com/elastic/kibana/commit/8f64d83377b)
  - Author: Kibana Machine
  - Date: 2025-10-27

- **[8.19] [tests] Increase package registry timeout (#240095) (#240876)** - [#240095](https://github.com/elastic/kibana/pull/240095)
  - Commit: [`587efdde8ce`](https://github.com/elastic/kibana/commit/587efdde8ce)
  - Author: Kibana Machine
  - Date: 2025-10-27

- **[8.19] fix Failing test: Jest Tests.src/platform/plugins/shared/dashboard/public/dashboard_api - initializeUnifiedSearchManager startComparing$ timeRange Should not return timeRanage change when timeRestore resets to false (#240715) (#240895)** - [#240715](https://github.com/elastic/kibana/pull/240715)
  - Commit: [`46cb11464fe`](https://github.com/elastic/kibana/commit/46cb11464fe)
  - Author: Kibana Machine
  - Date: 2025-10-28

- **[8.19] [Index Management] Fix data retention modal validation (#240062) (#240827)** - [#240062](https://github.com/elastic/kibana/pull/240062)
  - Commit: [`1f611c5793b`](https://github.com/elastic/kibana/commit/1f611c5793b)
  - Author: Kibana Machine
  - Date: 2025-10-28

- **[8.19] Sync bundled packages with Package Storage (#240867)** - [#240867](https://github.com/elastic/kibana/pull/240867)
  - Commit: [`93054801677`](https://github.com/elastic/kibana/commit/93054801677)
  - Author: elastic-vault-github-plugin-prod[bot]
  - Date: 2025-10-28

- **[8.19] [Security Solution] Allow partial matches on rule name when searching installed rules. (#237496) (#240940)** - [#237496](https://github.com/elastic/kibana/pull/237496)
  - Commit: [`98159da2ffe`](https://github.com/elastic/kibana/commit/98159da2ffe)
  - Author: Kibana Machine
  - Date: 2025-10-28

- **[8.19] [Serverless Search]Update AI assistant top bar  (#240336) (#241043)** - [#240336](https://github.com/elastic/kibana/pull/240336)
  - Commit: [`da3fe62a9c0`](https://github.com/elastic/kibana/commit/da3fe62a9c0)
  - Author: Saarika Bhasi
  - Date: 2025-10-28

- **[8.19] [ObsUX][Infra] Update Infrastructure Anomaly Detection 'Feedback' buttons to use short links (#240847) (#240999)** - [#240847](https://github.com/elastic/kibana/pull/240847)
  - Commit: [`1321da8ff09`](https://github.com/elastic/kibana/commit/1321da8ff09)
  - Author: Sergi Romeu
  - Date: 2025-10-29

- **[8.19] [Rules] Fixed infinite loop bug in investigation guide editor (#240472) (#241068)** - [#240472](https://github.com/elastic/kibana/pull/240472)
  - Commit: [`878f6fe4f19`](https://github.com/elastic/kibana/commit/878f6fe4f19)
  - Author: Kibana Machine
  - Date: 2025-10-29

- **[8.19] [ResponseOps] [FY25 - Kibana Secure Code Review] - Finding 47 Potential denial of service in ensureFieldIsSafeForQuery() function due to permissive regex search (#239280) (#241071)** - [#239280](https://github.com/elastic/kibana/pull/239280)
  - Commit: [`2b434c63335`](https://github.com/elastic/kibana/commit/2b434c63335)
  - Author: Kibana Machine
  - Date: 2025-10-29

- **[8.19] Sync bundled packages with Package Storage (#240991)** - [#240991](https://github.com/elastic/kibana/pull/240991)
  - Commit: [`f328f65093d`](https://github.com/elastic/kibana/commit/f328f65093d)
  - Author: elastic-vault-github-plugin-prod[bot]
  - Date: 2025-10-29

- **[8.19] [Security Solution][Detection Engine] Fix threshold rule logic with no group by fields defined (#241022) (#241122)** - [#241022](https://github.com/elastic/kibana/pull/241022)
  - Commit: [`373e3142b5c`](https://github.com/elastic/kibana/commit/373e3142b5c)
  - Author: Kibana Machine
  - Date: 2025-10-29

- **[8.19] [Discover][APM] Check for undefined data from useFetcher in TraceWaterfallEmbeddable (#240843) (#241099)** - [#240843](https://github.com/elastic/kibana/pull/240843)
  - Commit: [`e1f5a4f5223`](https://github.com/elastic/kibana/commit/e1f5a4f5223)
  - Author: Irene Blanco
  - Date: 2025-10-29

- **[8.19] [Obs AI Assistant] Fix overlapping components on the flyout for small screen sizes (#241026) (#241147)** - [#241026](https://github.com/elastic/kibana/pull/241026)
  - Commit: [`62a1715d22c`](https://github.com/elastic/kibana/commit/62a1715d22c)
  - Author: Kibana Machine
  - Date: 2025-10-29

- **[8.19] [Vega] Update Vega packages to latest  (#240831) (#240965)** - [#240831](https://github.com/elastic/kibana/pull/240831)
  - Commit: [`1f97c1f57cc`](https://github.com/elastic/kibana/commit/1f97c1f57cc)
  - Author: Marco Vettorello
  - Date: 2025-10-30

- **[8.19] [APM] Hide non-trace services in service map (#240104) (#241065)** - [#240104](https://github.com/elastic/kibana/pull/240104)
  - Commit: [`36f8da3da85`](https://github.com/elastic/kibana/commit/36f8da3da85)
  - Author: Sergi Romeu
  - Date: 2025-10-30

- **[8.19] [CI] Improve limits.yml overage message (#241216) (#241232)** - [#241216](https://github.com/elastic/kibana/pull/241216)
  - Commit: [`1824781fe09`](https://github.com/elastic/kibana/commit/1824781fe09)
  - Author: Kibana Machine
  - Date: 2025-10-30

- **[8.19] Scout reporting - add build trigger details (#241132) (#241178)** - [#241132](https://github.com/elastic/kibana/pull/241132)
  - Commit: [`a8e364a7db9`](https://github.com/elastic/kibana/commit/a8e364a7db9)
  - Author: Kibana Machine
  - Date: 2025-10-30

- **🌊 Streams: Strip managed properties from template (#241236)** - [#241236](https://github.com/elastic/kibana/pull/241236)
  - Commit: [`ca5b6090357`](https://github.com/elastic/kibana/commit/ca5b6090357)
  - Author: Joe Reuter
  - Date: 2025-10-30

- **[8.19] Sync bundled packages with Package Storage (#241161)** - [#241161](https://github.com/elastic/kibana/pull/241161)
  - Commit: [`90ec4e3fe70`](https://github.com/elastic/kibana/commit/90ec4e3fe70)
  - Author: elastic-vault-github-plugin-prod[bot]
  - Date: 2025-10-30

- **[8.19] [SecuritySolution] Fix entity flyout Risk contributions tab link (#241153) (#241228)** - [#241153](https://github.com/elastic/kibana/pull/241153)
  - Commit: [`6ffb88e36fa`](https://github.com/elastic/kibana/commit/6ffb88e36fa)
  - Author: Kibana Machine
  - Date: 2025-10-30

- **[8.19] [Maps] Show labels after saving edits while staying on Vector tiles (… (#240728) (#241285)** - [#240728](https://github.com/elastic/kibana/pull/240728)
  - Commit: [`2f6b2ebbc6d`](https://github.com/elastic/kibana/commit/2f6b2ebbc6d)
  - Author: Nathan Reese
  - Date: 2025-10-30

- **[8.19] [Security Solution] [Intelligence] Table Pagination Not Working as Expected (#241108) (#241295)** - [#241108](https://github.com/elastic/kibana/pull/241108)
  - Commit: [`fa7947dabc8`](https://github.com/elastic/kibana/commit/fa7947dabc8)
  - Author: Kibana Machine
  - Date: 2025-10-30

- **[8.19] [APM] Hide non-trace services in Service Inventory (#241080) (#241312)** - [#241080](https://github.com/elastic/kibana/pull/241080)
  - Commit: [`0e43210945e`](https://github.com/elastic/kibana/commit/0e43210945e)
  - Author: Sergi Romeu
  - Date: 2025-10-30

- **[8.19] [ResponseOps][Rules] Save button in settings flyout should remain disabled until settings are modified (#241238) (#241318)** - [#241238](https://github.com/elastic/kibana/pull/241238)
  - Commit: [`218416fc854`](https://github.com/elastic/kibana/commit/218416fc854)
  - Author: Kibana Machine
  - Date: 2025-10-30

- **[8.19] [ML][AI Connector] Anthropic Connector: ensure max tokens parameter is passed as expected by service (#241188) (#241206)** - [#241188](https://github.com/elastic/kibana/pull/241188)
  - Commit: [`6f6dd3db057`](https://github.com/elastic/kibana/commit/6f6dd3db057)
  - Author: Kibana Machine
  - Date: 2025-10-30

- **[8.19] [EDR Workflows] Fix event filter OS selector visibility and prepopulation from host events (#240791) (#241333)** - [#240791](https://github.com/elastic/kibana/pull/240791)
  - Commit: [`73a573f639a`](https://github.com/elastic/kibana/commit/73a573f639a)
  - Author: Kibana Machine
  - Date: 2025-10-30

- **[8.19] [ML][Inference Endpoints] Anthropic endpoint creation: ensure max tokens parameter is passed as expected (#241212) (#241353)** - [#241212](https://github.com/elastic/kibana/pull/241212)
  - Commit: [`ed7b97a186c`](https://github.com/elastic/kibana/commit/ed7b97a186c)
  - Author: Melissa Alvarez
  - Date: 2025-10-30

- **[8.19] [Bedrock] Remove default fallback region for Bedrock Connector (#241157) (#241377)** - [#241157](https://github.com/elastic/kibana/pull/241157)
  - Commit: [`adc06ca0700`](https://github.com/elastic/kibana/commit/adc06ca0700)
  - Author: Kibana Machine
  - Date: 2025-10-30

- **[upgrade assistant] Support passing excluded actions from ES to kibana for indices and data streams (#241222)** - [#241222](https://github.com/elastic/kibana/pull/241222)
  - Commit: [`e9e13156abb`](https://github.com/elastic/kibana/commit/e9e13156abb)
  - Author: Matthew Kime
  - Date: 2025-10-31

- **[8.19] Abort the request to the telemetry cluster after 10 seconds (#240230) (#240417)** - [#240230](https://github.com/elastic/kibana/pull/240230)
  - Commit: [`674dd2f2d55`](https://github.com/elastic/kibana/commit/674dd2f2d55)
  - Author: Kibana Machine
  - Date: 2025-10-31

- **[8.19] [Security Solution] Fix cannot remove operator after selection in exception builder (#236051) (#240270)** - [#236051](https://github.com/elastic/kibana/pull/236051)
  - Commit: [`f20ea4c6827`](https://github.com/elastic/kibana/commit/f20ea4c6827)
  - Author: Edgar Santos
  - Date: 2025-10-31

- **[8.19] [APM] adding missing fields to transaction (#241336) (#241503)** - [#241336](https://github.com/elastic/kibana/pull/241336)
  - Commit: [`11ce83e1a48`](https://github.com/elastic/kibana/commit/11ce83e1a48)
  - Author: Cauê Marcondes
  - Date: 2025-10-31

- **[8.19] [Detection Engine] Fix infinite-looping bug related to bootstrapping lists resources (#241052) (#241497)** - [#241052](https://github.com/elastic/kibana/pull/241052)
  - Commit: [`e1c0e285582`](https://github.com/elastic/kibana/commit/e1c0e285582)
  - Author: Ryland Herrick
  - Date: 2025-10-31

- **[8.19] [Obs AI Assistant] Fix bug with kibana tool when using a proxy (#236653) (#241458)** - [#236653](https://github.com/elastic/kibana/pull/236653)
  - Commit: [`f3dd8f13a03`](https://github.com/elastic/kibana/commit/f3dd8f13a03)
  - Author: Søren Louv-Jansen
  - Date: 2025-11-03

- **[8.19] [ResponseOps] Fix embeddable alerts panel flaky tests (#227999) (#241155)** - [#227999](https://github.com/elastic/kibana/pull/227999)
  - Commit: [`5d93b81c691`](https://github.com/elastic/kibana/commit/5d93b81c691)
  - Author: Christos Nasikas
  - Date: 2025-11-03

- **[8.19] [ML] Anomaly Explorer and Single Metric Viewer feedback button update (#239883) (#241586)** - [#239883](https://github.com/elastic/kibana/pull/239883)
  - Commit: [`950310f69db`](https://github.com/elastic/kibana/commit/950310f69db)
  - Author: Konrad Krasocki
  - Date: 2025-11-03

- **[8.19] [renovate] change react-test-renderer ownership to sharedux team (#241582) (#241617)** - [#241582](https://github.com/elastic/kibana/pull/241582)
  - Commit: [`256bf257c3a`](https://github.com/elastic/kibana/commit/256bf257c3a)
  - Author: Kibana Machine
  - Date: 2025-11-03

- **[8.19] [Search][A11y] Search application disable add selected button when error in selected indices (#241031) (#241624)** - [#241031](https://github.com/elastic/kibana/pull/241031)
  - Commit: [`bb899f91e4b`](https://github.com/elastic/kibana/commit/bb899f91e4b)
  - Author: Kibana Machine
  - Date: 2025-11-03

- **[8.19] Prevent object from being considered 4 days old (#239919) (#241437)** - [#239919](https://github.com/elastic/kibana/pull/239919)
  - Commit: [`f08bdc49f37`](https://github.com/elastic/kibana/commit/f08bdc49f37)
  - Author: Gerard Soldevila
  - Date: 2025-11-03

- **[8.19] [AI Infra] Fix index names causing incompatible cluster error when product docs are installed with for multiple Inference IDs (#240506) (#241578)** - [#240506](https://github.com/elastic/kibana/pull/240506)
  - Commit: [`ed3bb90c526`](https://github.com/elastic/kibana/commit/ed3bb90c526)
  - Author: Kibana Machine
  - Date: 2025-11-03

- **[8.19] [Fleet] Fix missing space in agent policy reassignment activity message (#241364) (#241546)** - [#241364](https://github.com/elastic/kibana/pull/241364)
  - Commit: [`405d9536296`](https://github.com/elastic/kibana/commit/405d9536296)
  - Author: Kibana Machine
  - Date: 2025-11-03

- **[8.19] [Cross-cluster replication] Fix error when resuming replication on created follower index (#240810) (#241695)** - [#240810](https://github.com/elastic/kibana/pull/240810)
  - Commit: [`b521fccfc8e`](https://github.com/elastic/kibana/commit/b521fccfc8e)
  - Author: Kibana Machine
  - Date: 2025-11-03

- **[8.19] [build] Fix snapshot Cloud deployment test (#241690) (#241717)** - [#241690](https://github.com/elastic/kibana/pull/241690)
  - Commit: [`caeab84905b`](https://github.com/elastic/kibana/commit/caeab84905b)
  - Author: Kibana Machine
  - Date: 2025-11-04

- **Update dependency selenium-webdriver to ^4.37.0 (8.19) (#241527)** - [#241527](https://github.com/elastic/kibana/pull/241527)
  - Commit: [`fe661c6e2be`](https://github.com/elastic/kibana/commit/fe661c6e2be)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-11-04

- **[8.19] Update dependency tar to ^7.5.1 (main) (#237638) (#241724)** - [#237638](https://github.com/elastic/kibana/pull/237638)
  - Commit: [`df5d1b57115`](https://github.com/elastic/kibana/commit/df5d1b57115)
  - Author: Kibana Machine
  - Date: 2025-11-04

- **[8.19] [Index Management] Branch data streams api tests lifecycle validation (#241105) (#241648)** - [#241105](https://github.com/elastic/kibana/pull/241105)
  - Commit: [`a8aa588276e`](https://github.com/elastic/kibana/commit/a8aa588276e)
  - Author: Sonia Sanz Vivas
  - Date: 2025-11-04

- **[8.19] [Ingest pipelines] Fix decimal truncation in ingest pipelines (#241446) (#241741)** - [#241446](https://github.com/elastic/kibana/pull/241446)
  - Commit: [`2a771e77518`](https://github.com/elastic/kibana/commit/2a771e77518)
  - Author: Kibana Machine
  - Date: 2025-11-04

- **[8.19] [kbn/failed-test-reporter] avoid creating GH issue for failed ES snapshot fetch (#241027) (#241190)** - [#241027](https://github.com/elastic/kibana/pull/241027)
  - Commit: [`8309729a357`](https://github.com/elastic/kibana/commit/8309729a357)
  - Author: Kibana Machine
  - Date: 2025-11-04

- **[8.19] [scout] determine test category based on playwright config path (#241361) (#241627)** - [#241361](https://github.com/elastic/kibana/pull/241361)
  - Commit: [`febf9211c51`](https://github.com/elastic/kibana/commit/febf9211c51)
  - Author: Dzmitry Lemechko
  - Date: 2025-11-04

- **[8.19] Create a wrapper to `@tanstack/query-client` (#241111)** - [#241111](https://github.com/elastic/kibana/pull/241111)
  - Commit: [`7bf2a571d9b`](https://github.com/elastic/kibana/commit/7bf2a571d9b)
  - Author: Gerard Soldevila
  - Date: 2025-11-04

- **[8.19] [scout] fix missing failed test annotations in BK (#239959) (#240119)** - [#239959](https://github.com/elastic/kibana/pull/239959)
  - Commit: [`a1e7d5ff850`](https://github.com/elastic/kibana/commit/a1e7d5ff850)
  - Author: Kibana Machine
  - Date: 2025-11-04

- **[8.19] [Maps] Fix flaky test in maps geo file – remove exact assertion on approximate document count (#241426) (#241781)** - [#241426](https://github.com/elastic/kibana/pull/241426)
  - Commit: [`ccd4f4215e8`](https://github.com/elastic/kibana/commit/ccd4f4215e8)
  - Author: Ola Pawlus
  - Date: 2025-11-04

- **[8.19] [Actions] set max limit on size of emails sent (#239572) (#241772)** - [#239572](https://github.com/elastic/kibana/pull/239572)
  - Commit: [`f35137af934`](https://github.com/elastic/kibana/commit/f35137af934)
  - Author: Dima Arnautov
  - Date: 2025-11-04

- **[8.19] [Synthetics] Make sure to use actual last started at value !! (#241686) (#241799)** - [#241686](https://github.com/elastic/kibana/pull/241686)
  - Commit: [`dd6547b5cd6`](https://github.com/elastic/kibana/commit/dd6547b5cd6)
  - Author: Kibana Machine
  - Date: 2025-11-04

- **[FTR] [8.19] Add missing test categories to functional test config (#241806)** - [#241806](https://github.com/elastic/kibana/pull/241806)
  - Commit: [`9e9f89b147f`](https://github.com/elastic/kibana/commit/9e9f89b147f)
  - Author: Cesare de Cal
  - Date: 2025-11-04

- **[8.19] Sync bundled packages with Package Storage (#241775)** - [#241775](https://github.com/elastic/kibana/pull/241775)
  - Commit: [`8699ed79257`](https://github.com/elastic/kibana/commit/8699ed79257)
  - Author: elastic-vault-github-plugin-prod[bot]
  - Date: 2025-11-05

- **[8.19] [ResponseOps][Maintenance Window] Timezone field disappears when specific timezone is selected (#241574) (#241953)** - [#241574](https://github.com/elastic/kibana/pull/241574)
  - Commit: [`c1c4ce67f37`](https://github.com/elastic/kibana/commit/c1c4ce67f37)
  - Author: Kibana Machine
  - Date: 2025-11-05

- **[8.19] Update dependency msw to ~2.11.6 (main) (#241559) (#241771)** - [#241559](https://github.com/elastic/kibana/pull/241559)
  - Commit: [`651decec303`](https://github.com/elastic/kibana/commit/651decec303)
  - Author: Maxim Kholod
  - Date: 2025-11-05

- **[8.19] [Observability Onboarding] Copy update for landing page messages (#241767) (#241924)** - [#241767](https://github.com/elastic/kibana/pull/241767)
  - Commit: [`ed68631474c`](https://github.com/elastic/kibana/commit/ed68631474c)
  - Author: Alex Fernandez
  - Date: 2025-11-05

- **[Discover] Restore the fix for CSV (#241931)** - [#241931](https://github.com/elastic/kibana/pull/241931)
  - Commit: [`4380a279ba4`](https://github.com/elastic/kibana/commit/4380a279ba4)
  - Author: Julia Rechkunova
  - Date: 2025-11-05

- **[8.19] [Security Solution] Implement prebuilt rules package generation tool (#237561) (#241945)** - [#237561](https://github.com/elastic/kibana/pull/237561)
  - Commit: [`f7c3e3953e0`](https://github.com/elastic/kibana/commit/f7c3e3953e0)
  - Author: Maxim Palenov
  - Date: 2025-11-05

- **[8.19] [Defend Workflows][Osquery] Multiple fixes for pack management (#241655) (#241962)** - [#241655](https://github.com/elastic/kibana/pull/241655)
  - Commit: [`183bb5f191a`](https://github.com/elastic/kibana/commit/183bb5f191a)
  - Author: Konrad Szwarc
  - Date: 2025-11-05

- **[8.19] [Synthetics] Sync task de-dupe cache init !! (#241094) (#241468)** - [#241094](https://github.com/elastic/kibana/pull/241094)
  - Commit: [`1dba050914f`](https://github.com/elastic/kibana/commit/1dba050914f)
  - Author: Kibana Machine
  - Date: 2025-11-05

- **Update docker.elastic.co/wolfi/chainguard-base:latest Docker digest to 401d868 (8.19) (#240698)** - [#240698](https://github.com/elastic/kibana/pull/240698)
  - Commit: [`7c2901bf421`](https://github.com/elastic/kibana/commit/7c2901bf421)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-11-05

- **Update docker.elastic.co/wolfi/chainguard-base-fips:latest Docker digest to dea9b73 (8.19) (#240697)** - [#240697](https://github.com/elastic/kibana/pull/240697)
  - Commit: [`fea946ca071`](https://github.com/elastic/kibana/commit/fea946ca071)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-11-05

- **[8.19] Sync bundled packages with Package Storage (#242069)** - [#242069](https://github.com/elastic/kibana/pull/242069)
  - Commit: [`745932f0614`](https://github.com/elastic/kibana/commit/745932f0614)
  - Author: elastic-vault-github-plugin-prod[bot]
  - Date: 2025-11-06

- **[8.19] [Security Solution] fix flakiness in alerts generation FTR test (#241922) (#242018)** - [#241922](https://github.com/elastic/kibana/pull/241922)
  - Commit: [`8768731fba8`](https://github.com/elastic/kibana/commit/8768731fba8)
  - Author: Maxim Palenov
  - Date: 2025-11-06

- **[Fleet] Fix setup lock retry (#242008)** - [#242008](https://github.com/elastic/kibana/pull/242008)
  - Commit: [`507325d6d40`](https://github.com/elastic/kibana/commit/507325d6d40)
  - Author: Mason Herron
  - Date: 2025-11-06

- **[8.19] Task Manager: fix space resolution when request provided in the task (#240025) (#240788)** - [#240025](https://github.com/elastic/kibana/pull/240025)
  - Commit: [`f5936eba82e`](https://github.com/elastic/kibana/commit/f5936eba82e)
  - Author: Kibana Machine
  - Date: 2025-11-06

- **[8.19][Console] Unskip ESQL suggestions test (#241869)** - [#241869](https://github.com/elastic/kibana/pull/241869)
  - Commit: [`535ef65c0f9`](https://github.com/elastic/kibana/commit/535ef65c0f9)
  - Author: Elena Stoeva
  - Date: 2025-11-06

- **[8.19] [Discover][Unified Waterfall] Add recursion guard for flattening item map (#241329) (#242124)** - [#241329](https://github.com/elastic/kibana/pull/241329)
  - Commit: [`211704b6468`](https://github.com/elastic/kibana/commit/211704b6468)
  - Author: Gonçalo Rica Pais da Silva
  - Date: 2025-11-06

- **[8.19] [Security Solution] Fix top n popover overlapping new case flyout (#242045) (#242167)** - [#242045](https://github.com/elastic/kibana/pull/242045)
  - Commit: [`370e72ca8b6`](https://github.com/elastic/kibana/commit/370e72ca8b6)
  - Author: Kibana Machine
  - Date: 2025-11-06

- **skip failing test suite (#240348)** - [#240348](https://github.com/elastic/kibana/pull/240348)
  - Commit: [`5db40b24d1e`](https://github.com/elastic/kibana/commit/5db40b24d1e)
  - Author: Kibana Machine
  - Date: 2025-10-27

- **skip flaky suite (#223652)** - [#223652](https://github.com/elastic/kibana/pull/223652)
  - Commit: [`866f41a7873`](https://github.com/elastic/kibana/commit/866f41a7873)
  - Author: Tiago Costa
  - Date: 2025-11-06

- **skip flaky suite (#223654)** - [#223654](https://github.com/elastic/kibana/pull/223654)
  - Commit: [`06a38f3f1b5`](https://github.com/elastic/kibana/commit/06a38f3f1b5)
  - Author: Tiago Costa
  - Date: 2025-11-06

- **[8.19] [Fleet] Disable standalone installation for Fleet Server policies (#241699) (#242191)** - [#241699](https://github.com/elastic/kibana/pull/241699)
  - Commit: [`fa3ea986c2a`](https://github.com/elastic/kibana/commit/fa3ea986c2a)
  - Author: Kibana Machine
  - Date: 2025-11-06

- **[Fleet] Fix fleet internal.retryOnBoot config (#242186)** - [#242186](https://github.com/elastic/kibana/pull/242186)
  - Commit: [`8e4a5e2a6ef`](https://github.com/elastic/kibana/commit/8e4a5e2a6ef)
  - Author: Nicolas Chaulet
  - Date: 2025-11-06

- **[8.19] dependency: update `yaml` package to 2.8.1 (#242178) (#242194)** - [#242178](https://github.com/elastic/kibana/pull/242178)
  - Commit: [`4940405534c`](https://github.com/elastic/kibana/commit/4940405534c)
  - Author: Kibana Machine
  - Date: 2025-11-06

- **Update docker.elastic.co/wolfi/chainguard-base:latest Docker digest to 4d7c143 (8.19) (#242086)** - [#242086](https://github.com/elastic/kibana/pull/242086)
  - Commit: [`60c8315fcaa`](https://github.com/elastic/kibana/commit/60c8315fcaa)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-11-07

- **[Fleet] Backport lock manager service usage (#242210)** - [#242210](https://github.com/elastic/kibana/pull/242210)
  - Commit: [`0c54d11e749`](https://github.com/elastic/kibana/commit/0c54d11e749)
  - Author: Nicolas Chaulet
  - Date: 2025-11-07

- **Update docker.elastic.co/wolfi/chainguard-base-fips:latest Docker digest to 8de0d35 (8.19) (#242085)** - [#242085](https://github.com/elastic/kibana/pull/242085)
  - Commit: [`3b58c04850d`](https://github.com/elastic/kibana/commit/3b58c04850d)
  - Author: elastic-renovate-prod[bot]
  - Date: 2025-11-07

- **[8.19] Update reporting dependencies (main) (#235590) (#242203)** - [#235590](https://github.com/elastic/kibana/pull/235590)
  - Commit: [`c6c9a1ebaf2`](https://github.com/elastic/kibana/commit/c6c9a1ebaf2)
  - Author: Patrick Mueller
  - Date: 2025-11-07


---

## Changes by Area

### Top Directories by Number of Files Changed

   3.7% src/platform/packages/shared/response-ops/
   6.1% src/platform/packages/shared/
   3.3% src/platform/plugins/
   3.8% x-pack/platform/packages/shared/
   6.0% x-pack/platform/plugins/private/
   3.2% x-pack/platform/plugins/shared/cases/public/
   3.3% x-pack/platform/plugins/shared/fleet/
   3.0% x-pack/platform/plugins/shared/osquery/
   3.0% x-pack/platform/plugins/shared/triggers_actions_ui/
   9.4% x-pack/platform/plugins/shared/
   3.6% x-pack/solutions/observability/plugins/slo/public/
   7.1% x-pack/solutions/observability/plugins/
   8.2% x-pack/solutions/search/plugins/
   3.2% x-pack/solutions/security/plugins/security_solution/public/detection_engine/
   4.1% x-pack/solutions/security/plugins/security_solution/public/management/
   5.9% x-pack/solutions/security/plugins/security_solution/public/
   6.4% x-pack/solutions/security/plugins/
   3.3% x-pack/solutions/security/test/
   3.4% x-pack/solutions/
   3.0% x-pack/

### Top Contributors

- Kibana Machine: 105 commits
- elastic-renovate-prod[bot]: 22 commits
- elastic-vault-github-plugin-prod[bot]: 9 commits
- Dzmitry Lemechko: 8 commits
- Brad White: 8 commits
- Tiago Costa: 5 commits
- Nastasha Solomon: 4 commits
- Dennis Tismenko: 4 commits
- Sergi Romeu: 3 commits
- Nikita Indik: 3 commits
- Nicolas Chaulet: 3 commits
- Nathan Reese: 3 commits
- Maxim Palenov: 3 commits
- Alex Szabo: 3 commits
- florent-leborgne: 2 commits

---

## Major Changes

### Dependency Updates

Notable dependency updates identified:
```
-  "version": "8.19.5",
+  "version": "8.19.7",
-    "globby/fast-glob": "^3.3.2"
+    "globby/fast-glob": "^3.3.2",
+    "vega-expression": "5.2.1",
+    "vega-interpreter": "1.2.1",
+    "vega-util": "1.17.4"
+    "@kbn/react-query": "link:src/platform/packages/shared/kbn-react-query",
-    "@kbn/security-solution-test-api-clients": "link:x-pack/solutions/security/packages/test-api-clients",
-    "@moonrepo/cli": "1.40.1",
+    "@moonrepo/cli": "1.41.5",
-    "@openfeature/core": "^1.9.0",
-    "@openfeature/launchdarkly-client-provider": "^0.3.2",
+    "@openfeature/core": "^1.9.1",
+    "@openfeature/launchdarkly-client-provider": "^0.3.3",
-    "core-js": "^3.42.0",
+    "core-js": "^3.45.1",
-    "launchdarkly-js-client-sdk": "^3.8.1",
+    "launchdarkly-js-client-sdk": "^3.9.0",
-    "nodemailer": "^6.9.15",
+    "nodemailer": "^7.0.9",
-    "object-path-immutable": "^3.1.1",
+    "object-path-immutable": "^4.1.2",
-    "pdfmake": "^0.2.15",
+    "pdfmake": "^0.2.20",
-    "puppeteer": "24.17.0",
+    "puppeteer": "24.24.0",
-    "tar": "^7.4.3",
+    "tar": "^7.5.1",
-    "vega-interpreter": "^1.0.4",
```

### File Type Breakdown

**TypeScript/JavaScript Files:**
 1507 files changed, 22167 insertions(+), 7555 deletions(-)

**Test Files:**
 317 files changed, 11119 insertions(+), 2294 deletions(-)

**Configuration Files:**
 100 files changed, 684 insertions(+), 357 deletions(-)

**Documentation Files:**
 8 files changed, 849 insertions(+), 378 deletions(-)

---

## How to Use This Information

1. **Review specific PRs**: Click on the PR links to see detailed discussions and changes
2. **Check commits**: Click on commit hashes to see the exact code changes
3. **Filter by author**: Use the contributors list to find changes by specific developers
4. **Explore areas**: Use the directory statistics to understand which parts of the codebase changed most

---

## Additional Resources

- **Full comparison on GitHub**: [v8.19.5...v8.19.7](https://github.com/elastic/kibana/compare/v8.19.5...v8.19.7)
- **Release notes**: Check the [Kibana releases page](https://github.com/elastic/kibana/releases)
- **Documentation**: Visit [Kibana documentation](https://www.elastic.co/guide/en/kibana/current/index.html)

---

*Generated on $(date)*
*Command: \`git log v8.19.5..v8.19.7\`*
