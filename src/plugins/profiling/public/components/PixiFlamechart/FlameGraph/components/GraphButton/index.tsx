import { FC } from "react";

import ChevronLeftIcon from "../../icons/ChevronLeftIcon";
import ChevronRightIcon from "../../icons/ChevronRightIcon";
import RecenterIcon from "../../icons/RecenterIcon";

import css from "./graphButton.module.scss";

type IconType = "previous" | "next" | "recenter";

interface Props {
  onClick: Function;
  disabled?: boolean;
  icon: IconType;
  className?: string;
}

const GraphButton: FC<Props> = ({ disabled, icon, onClick, className }) => {
  const renderIcon = (icon: IconType) => {
    const size = 16;

    switch (icon) {
      case "previous":
        return (
          <ChevronLeftIcon width={size} height={size} className={css.icon} />
        );

      case "next":
        return (
          <ChevronRightIcon width={size} height={size} className={css.icon} />
        );

      case "recenter":
        return <RecenterIcon width={size} height={size} className={css.icon} />;
    }
  };

  return (
    <button
      className={`${css.host} ${className}`}
      disabled={disabled}
      onClick={evt => onClick(evt)}
    >
      {renderIcon(icon)}
    </button>
  );
};

export default GraphButton;
