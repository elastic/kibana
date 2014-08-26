        // Copyright: 2014 PMSI-AlignAlytics
        // License: "https://github.com/PMSI-AlignAlytics/dimple/blob/master/MIT-LICENSE.txt"
        // Source: /src/objects/chart/methods/addAxis.js
        // Help: http://github.com/PMSI-AlignAlytics/dimple/wiki/dimple.chart#wiki-addAxis
        this.addAxis  = function (position, categoryFields, measure, timeField) {
            // The axis to return
            var axis = null,
                master = null;
            // Convert the passed category fields to an array in case a single string is sent
            if (categoryFields !== null && categoryFields !== undefined) {
                categoryFields = [].concat(categoryFields);
            }
            // If this is a standard axis a position will have been passed as a string
            if ((typeof position) === "string" || (position instanceof String)) {
                // Create the axis object based on the passed parameters
                axis = new dimple.axis(
                    this,
                    position,
                    categoryFields,
                    measure,
                    timeField
                );
                // Add the axis to the array for the chart
                this.axes.push(axis);

            } else {
                // In the case of a composite axis the position will contain another axis
                // To make this code more readable reassign the position to a different variable
                master = position;
                // Construct the axis object
                axis = new dimple.axis(
                    this,
                    master.position,
                    categoryFields,
                    measure,
                    timeField
                );
                // Validate that the master and child axes are compatible
                if (axis._hasMeasure() !== master._hasMeasure()) {
                    throw "You have specified a composite axis where some but not all axes have a measure - this is not supported, all axes must be of the same type.";
                } else if (axis._hasTimeField() !== master._hasTimeField()) {
                    throw "You have specified a composite axis where some but not all axes have a time field - this is not supported, all axes must be of the same type.";
                } else if ((axis.categoryFields === null || axis.categoryFields === undefined ? 0 : axis.categoryFields.length) !== (master.categoryFields === null || master.categoryFields === undefined ? 0 : master.categoryFields.length)) {
                    throw "You have specified a composite axis where axes have differing numbers of category fields - this is not supported, all axes must be of the same type.";
                }
                // Do not add the axis to the chart's axes array, instead add it the master
                master._slaves.push(axis);
            }
            // return the axis
            return axis;
        };

