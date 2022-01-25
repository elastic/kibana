import { FC } from "react";
import { Link } from "react-router-dom";
import { connect } from "react-redux";

import CalleeIcon from "../../icons/CalleeIcon";
import BoxIcon from "../../icons/BoxIcon";

import { QueryFilter } from "../../redux/types/general";
import { State } from "../../redux/types";

import { isSandboxEnabled } from "../../services/featureFlags";

import { unsymbolizedFrameTitle } from "../../helpers/trace";
import truncateTimestampIntoSeconds from "../../helpers/truncateTimestampIntoSeconds";

import css from "./function-link.module.scss";

interface Fn {
  name: string;
  sourceId: string;
  sourceLine: number;
  url: string;
  filename: string;
  exeFileId: string;
  exeFileName: string;
  exeFileOffset: number | string;
  frameTypeString: string;
  functionLine: number;
}

interface Props {
  projectId: string;
  fn: Fn;
  queryFilters: QueryFilter;
  isCollapsed?: boolean;
}

export const callgraphLink = (
  projectId: string,
  exeFileName: string,
  sourceFilename: string,
  functionName: string,
  fileID: string,
  addressOrLine: number | string,
  queryFiltersStartDate?: number | null | undefined,
  queryFiltersEndDate?: number | null | undefined,
  queryFiltersText?: string | null | undefined
) => {
  let frameID: string;
  // For details see processFrameForGrouping in pf-web-service/handlers/common/common.go.
  // Using semicolon as separator as it's less likely to occur in the field values.
  if (functionName !== "") {
    if (sourceFilename !== "") {
      // fully symbolized frame
      frameID = `${exeFileName};${encodeURIComponent(
        sourceFilename
      )};${encodeURIComponent(functionName)};;`;
    } else {
      // ELF-symbolized frame
      frameID = `;;${encodeURIComponent(functionName)};${fileID};`;
    }
  } else {
    // unsymbolized frame
    frameID = `;;;${fileID};${addressOrLine}`;
  }

  let link = `/projects/${projectId}/callgraph/${frameID}`;

  // we might not pass this two dates and we don't want the URL to be populated with `undefined`
  if (queryFiltersStartDate && queryFiltersEndDate) {
    link += `?startDate=${queryFiltersStartDate}&endDate=${queryFiltersEndDate}`;

    /**
     * We're always going to get the dates from our queryFilters
     * which mean that they'll always exist
     * So we can do the check for the text after adding the dates for the url
     */
    if (queryFiltersText) {
      link += `&text=${queryFiltersText}`;
    }
  }

  return link;
};

const FunctionLink: FC<Props> = ({
  projectId,
  fn,
  queryFilters,
  isCollapsed
}) => {
  const queryFiltersStartDate =
    queryFilters.startDate &&
    truncateTimestampIntoSeconds(queryFilters.startDate);
  const queryFiltersEndDate =
    queryFilters.endDate && truncateTimestampIntoSeconds(queryFilters.endDate);
  const queryFiltersText =
    queryFilters.text && encodeURIComponent(queryFilters.text);

  // best case scenario we have the file names. source lines and function names.
  // However we need to deal with missing function / executable info.
  let exeDisplayName = fn.exeFileName ? fn.exeFileName : fn.frameTypeString;

  // When there is no function name, only use the executable name
  let fnText = fn.name ? exeDisplayName + ": " + fn.name : exeDisplayName;

  let linkText =
    fn.filename + (fn.functionLine !== 0 ? `#${fn.functionLine}` : "");

  if (fn.filename === "" && fn.sourceLine === 0) {
    let exeIdentifier = fn.exeFileName;
    if (exeIdentifier) {
      // If no sourceLine / filename available, display the offset in the executable.
      let exeOffset = fn.exeFileOffset.toString(16);

      linkText = exeIdentifier + "+0x" + exeOffset;
    } else {
      // If we don't have the file name for the executable, display <unsymbolized>
      linkText = "<unsymbolized>";
    }
  } else if (fn.filename !== "" && fn.sourceLine === 0) {
    linkText = fn.filename;
  }

  return (
    <div className={css.host}>
      {fn.filename === "" ? (
        <div className={`${css.link} ${css.disabled}`}>
          <CalleeIcon width={14} height={14} className={css.functionIcon} />
          <span
            className={`${css.text} ${css.fnText} ${
              isCollapsed ? css.isCollapsed : ""
            }`}
          >
            {fnText ? fnText : unsymbolizedFrameTitle}
          </span>
        </div>
      ) : (
        // TODO: refactor the callgraph path so that the source info is passed as query param instead. This will allow us to, when the user selects a certain node, to change the query params on the callgraph screen to match that node, allowing the user to share the callgraph focused on that node via a deep link
        <Link
          to={callgraphLink(
            projectId,
            fn.exeFileName,
            fn.filename,
            fn.name,
            fn.exeFileId,
            fn.exeFileOffset,
            queryFiltersStartDate,
            queryFiltersEndDate,
            queryFiltersText
          )}
          target="_blank"
          rel="noopener noreferrer"
          className={css.link}
        >
          <CalleeIcon width={14} height={14} className={css.functionIcon} />
          <span
            className={`${css.text} ${css.fnText} ${
              isCollapsed ? css.isCollapsed : ""
            }`}
          >
            {fnText}
          </span>
        </Link>
      )}
      <a
        className={`${css.link} ${isSandboxEnabled() ? "" : css.disabled}`}
        href={fn.url}
        target="_blank"
        rel="noreferrer"
      >
        <BoxIcon width={14} height={14} className={css.fileIcon} />
        <span
          className={`${css.text} ${css.linkText} ${
            isCollapsed ? css.isCollapsed : ""
          }`}
        >
          {linkText}
        </span>
      </a>
    </div>
  );
};

const mapStateToProps = (state: State) => {
  const { filters } = state.general;
  return {
    queryFilters: filters
  };
};

export default connect(mapStateToProps)(FunctionLink);
