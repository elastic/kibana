import React, { FC } from "react";

interface Props {
  width?: number;
  height?: number;
  className?: string;
}

const ChartIcon: FC<Props> = ({ width, height, className }) => {
  return (
    <svg
      viewBox="0 0 14 14"
      width={width}
      height={height}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.6111111 7h-2.7222222l-2.04166668 6L4.76388889 1 2.72222222 7H0"
        strokeWidth="1.2"
        fill="none"
        fillRule="evenodd"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ChartIcon;
