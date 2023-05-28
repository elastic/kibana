import _ from "lodash";
import prettyMS from "pretty-ms";
import { table } from "table";
import { cyan, gray, green, red, white } from "../log";

const failureIcon = red("✖");
const successIcon = green("✔");

export const summaryTable = (r: CypressCommandLine.CypressRunResult) => {
  const overallSpecCount = r.runs.length;
  const failedSpecsCount = _.sum(
    r.runs.filter((v) => v.stats.failures + v.stats.skipped > 0).map(() => 1)
  );
  const hasFailed = failedSpecsCount > 0;

  const verdict = hasFailed
    ? red(`${failedSpecsCount} of ${overallSpecCount} failed`)
    : overallSpecCount > 0
    ? "All specs passed!"
    : "No specs executed";

  const data = r.runs.map((r) => [
    r.stats.failures + r.stats.skipped > 0 ? failureIcon : successIcon,
    r.spec.relativeToCommonRoot,
    gray(prettyMS(r.stats.duration)),
    white(r.stats.tests ?? 0),
    r.stats.passes ? green(r.stats.passes) : gray("-"),
    r.stats.failures ? red(r.stats.failures) : gray("-"),
    r.stats.pending ? cyan(r.stats.pending) : gray("-"),
    r.stats.skipped ? red(r.stats.skipped) : gray("-"),
  ]);

  return table(
    [
      [
        "", // marker
        gray("Spec"),
        "",
        gray("Tests"),
        gray("Passing"),
        gray("Failing"),
        gray("Pending"),
        gray("Skipped"),
      ],
      ...data,
      [
        hasFailed ? failureIcon : successIcon, // marker
        verdict,
        gray(prettyMS(r.totalDuration ?? 0)),
        overallSpecCount > 0 ? white(r.totalTests ?? 0) : gray("-"),
        r.totalPassed ? green(r.totalPassed) : gray("-"),
        r.totalFailed ? red(r.totalFailed) : gray("-"),
        r.totalPending ? cyan(r.totalPending) : gray("-"),
        r.totalSkipped ? red(r.totalSkipped) : gray("-"),
      ],
    ],
    {
      border,
      columnDefault: {
        width: 8,
      },
      columns: [
        { alignment: "left", width: 2 },
        { alignment: "left", width: 30 },
        { alignment: "right" },
        { alignment: "right" },
        { alignment: "right" },
        { alignment: "right" },
        { alignment: "right" },
        { alignment: "right" },
      ],
      // singleLine: true,
      drawHorizontalLine: (lineIndex, rowCount) => {
        return (
          lineIndex === 1 ||
          lineIndex === 0 ||
          lineIndex === rowCount - 1 ||
          lineIndex === rowCount
        );
      },
      drawVerticalLine: (lineIndex, rowCount) => {
        return lineIndex === 0 || rowCount === lineIndex;
      },
    }
  );
};

const border = _.mapValues(
  {
    topBody: `─`,
    topJoin: `┬`,
    topLeft: `  ┌`,
    topRight: `┐`,

    bottomBody: `─`,
    bottomJoin: `┴`,
    bottomLeft: `  └`,
    bottomRight: `┘`,

    bodyLeft: `  │`,
    bodyRight: `│`,
    bodyJoin: `│`,

    joinBody: `─`,
    joinLeft: `  ├`,
    joinRight: `┤`,
    joinJoin: `┼`,
  },
  (v) => gray(v)
);
